use std::{
    collections::HashMap,
    ffi::OsStr,
    fs::{self, read_dir, File},
    io::{Read, Write},
    path::{Path, PathBuf},
    time::UNIX_EPOCH,
};

use bitbuffer::BitRead;
use log::warn;
use serde::{Deserialize, Serialize};

use self::errors::DemoReadError;

pub mod analyser;
pub mod errors;

pub const HEADER_SIZE: usize = 8 + 4 + 4 + 260 + 260 + 260 + 260 + 4 + 4 + 4 + 4;

#[cfg_attr(test, derive(PartialEq))]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum DemoEventType {
    Bookmark,
    Killstreak,
}

#[cfg_attr(test, derive(PartialEq))]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DemoEvent {
    pub name: DemoEventType,
    pub value: String,
    pub tick: u64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Demo {
    pub name: String,
    pub path: PathBuf,
    pub birthtime: u64,
    pub filesize: u64,
    pub events: Vec<DemoEvent>,
    pub tags: Vec<String>,
    pub server_name: String,
    pub client_name: String,
    pub map_name: String,
    pub playback_time: f32,
    pub num_ticks: u32,
}

impl Demo {
    pub fn new(
        name: String,
        path: PathBuf,
        header: tf_demo_parser::demo::header::Header,
        events: Vec<DemoEvent>,
        tags: Vec<String>,
        metadata: fs::Metadata,
    ) -> Self {
        Self {
            name,
            path,
            birthtime: metadata
                .modified()
                .unwrap_or(UNIX_EPOCH)
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
            filesize: metadata.len(),
            events,
            tags,
            server_name: header.server,
            client_name: header.nick,
            map_name: header.map,
            playback_time: header.duration,
            num_ticks: header.ticks,
        }
    }
}

// This uses `&'a Vec` instead of just `Vec` so we don't have to copy
// the entire Vector to serialize it
#[derive(Serialize)]
pub struct DemoJsonFileSer<'a> {
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub events: &'a Vec<DemoEvent>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub tags: &'a Vec<String>,
}

// Since deserializing a struct with lifetimes is not supported,
// we have to do a bit of code duplication here and make a second
// struct for deserializing
#[derive(Deserialize)]
pub struct DemoJsonFileDe {
    pub events: Option<Vec<DemoEvent>>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
pub enum DemoCommandError {
    DemoNotFound,
    FileDeleteFailed,
    FileOpenFailed,
    FileReadFailed,
    FileRenameFailed,
    FileWriteFailed,
    OtherIOError,
    ParsingFailed,
    SerializationFailed,
}

/// Read the header of the demo file at `path`.
///
/// # Errors
/// This fails in the following cases:
/// - The file is not able to be opened, possibly because it doesn't exist or the user has insufficient permissions
/// - The file is incomplete or has an invalid header
/// - The file header indicates that this demo was recorded for a game that is not TF2
pub fn read_demo_header(
    path: &Path,
) -> Result<tf_demo_parser::demo::header::Header, DemoReadError> {
    let mut file = File::open(path)?;

    let mut buf = [0u8; HEADER_SIZE];
    file.read_exact(&mut buf)?;

    let demo = tf_demo_parser::Demo::new(&buf);

    let mut stream = demo.get_stream();
    let header = tf_demo_parser::demo::header::Header::read(&mut stream)
        .or(Err(DemoReadError::InvalidHeader))?;

    if header.game != *"tf" {
        return Err(DemoReadError::NotTF2);
    }

    Ok(header)
}

/// Read the JSON file at `json_path` and extract lists of tags and events.
/// If no JSON file exists or it is invalid, empty lists will be returned.
pub fn read_events_and_tags(json_path: &Path) -> (Vec<DemoEvent>, Vec<String>) {
    // This fails if the file does not exist or is not readable
    if let Ok(bytes) = fs::read(json_path) {
        // This fails if the file does not contain valid JSON matching the `DemoJsonFile` type.
        if let Ok(deserialized) = serde_json::from_slice::<DemoJsonFileDe>(&bytes) {
            return (
                deserialized.events.unwrap_or_default(),
                deserialized.tags.unwrap_or_default(),
            );
        } else {
            warn!("Invalid JSON file at {}", &json_path.display());
        }
    }

    // If the JSON file does not exist or contains invalid content,
    // Return empty lists for events and tags
    (Vec::new(), Vec::new())
}

/// Read the demo at `path`.
/// This will also read events and tags from the associated JSON file, if it exists.
pub fn read_demo(path: &Path) -> Result<Demo, DemoReadError> {
    let name: String = path
        .file_stem()
        .ok_or(DemoReadError::InvalidFilename)?
        .to_str()
        .ok_or(DemoReadError::InvalidFilename)?
        .to_owned();
    let metadata = path.metadata()?;
    if !metadata.is_file() {
        return Err(DemoReadError::NotAFile);
    }
    let header = read_demo_header(path)?;
    let (events, tags) = read_events_and_tags(&path.with_extension("json"));
    Ok(Demo::new(
        name,
        path.to_path_buf(),
        header,
        events,
        tags,
        metadata,
    ))
}

/// Find all demos in the directory at `dir_path` and collect them in a `HashMap`.
pub fn read_demos_in_directory(dir_path: &Path) -> Result<HashMap<String, Demo>, DemoReadError> {
    let dir_iterator = read_dir(dir_path)?;

    let mut new_demos: HashMap<String, Demo> = HashMap::new();

    for dir_entry in dir_iterator.flatten() {
        let file_path = dir_entry.path();

        // Check if the file extension matches
        if file_path.extension() == Some(OsStr::new("dem")) {
            match read_demo(&file_path) {
                Ok(demo) => {
                    new_demos.insert(demo.name.clone(), demo);
                }
                Err(e) => {
                    warn!("Demo failed to load: {:?}: {}", e, file_path.display());
                }
            }
        }
    }

    Ok(new_demos)
}

pub fn write_events_and_tags(
    json_path: &Path,
    events: &Vec<DemoEvent>,
    tags: &Vec<String>,
) -> Result<(), DemoCommandError> {
    if events.is_empty() && tags.is_empty() {
        fs::remove_file(json_path).or(Err(DemoCommandError::FileWriteFailed))?;
        return Ok(());
    }

    let mut file = fs::OpenOptions::new()
        .write(true)
        .truncate(true)
        .create(true)
        .open(json_path)
        .or(Err(DemoCommandError::FileOpenFailed))?;

    // Use tabs for indentation to reproduce the style TF2 produces
    let formatter = serde_json::ser::PrettyFormatter::with_indent(b"\t");
    let mut serializer = serde_json::Serializer::with_formatter(Vec::new(), formatter);
    let new_content = DemoJsonFileSer { events, tags };
    if new_content.serialize(&mut serializer).is_err() {
        return Err(DemoCommandError::SerializationFailed);
    }

    file.write_all(&serializer.into_inner())
        .or(Err(DemoCommandError::FileWriteFailed))?;
    Ok(())
}
