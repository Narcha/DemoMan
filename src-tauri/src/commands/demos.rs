use std::path::Path;
use std::vec::Vec;

use log::info;

use tauri::State;

use crate::demo::{
    analyser::{GameDetailsAnalyser, GameSummary},
    errors::DemoReadError,
    read_demos_in_directory, write_events_and_tags, Demo, DemoCommandError, DemoEvent,
};
use crate::AppState;

/// Load the demos in the directory at `dir_path` into the demo cache.
/// Returns the number of demos loaded if successful.
#[tauri::command]
pub async fn get_demos_in_directory(
    dir_path: String,
    state: State<'_, AppState>,
) -> Result<Vec<Demo>, DemoReadError> {
    let mut cache = state.demo_cache.lock().expect("Failed to lock mutex");

    let dir_path = Path::new(&dir_path).canonicalize()?;

    info!("Reading demos from {}", dir_path.display());

    if Some(&dir_path) != cache.cached_directory.as_ref() {
        // The cache contains the wrong or no directory
        info!("Cache miss! loading demos from disk...");

        cache.cached_directory = Some(dir_path.clone());
        cache.demos = read_demos_in_directory(&dir_path)?;
    } else {
        info!("Using cached demos");
    }

    // TODO: figure out how to avoid cloning here,
    // possibly by wrapping the demos in some sort
    // of smart pointer
    Ok(cache.demos.values().cloned().collect())
}

#[tauri::command]
pub fn set_demo_events(
    demo_name: String,
    new_events: Vec<DemoEvent>,
    state: State<'_, AppState>,
) -> Result<(), DemoCommandError> {
    let mut demos_cache = state.demo_cache.lock().expect("Failed to lock mutex");
    let demo = demos_cache
        .demos
        .get_mut(&demo_name)
        .ok_or(DemoCommandError::DemoNotFound)?;
    let json_path = demo.path.with_extension("json");
    write_events_and_tags(&json_path, &new_events, &demo.tags)?;
    demo.events = new_events;
    Ok(())
}

#[tauri::command]
pub fn set_demo_tags(
    demo_name: String,
    new_tags: Vec<String>,
    state: State<'_, AppState>,
) -> Result<(), DemoCommandError> {
    let mut demos_cache = state.demo_cache.lock().expect("Failed to lock mutex");
    let demo = demos_cache
        .demos
        .get_mut(&demo_name)
        .ok_or(DemoCommandError::DemoNotFound)?;
    let json_path = demo.path.with_extension("json");
    write_events_and_tags(&json_path, &demo.events, &new_tags)?;
    demo.tags = new_tags;
    Ok(())
}

#[tauri::command]
pub fn delete_demo(
    demo_name: String,
    trash: bool,
    state: State<'_, AppState>,
) -> Result<(), DemoCommandError> {
    info!("Deleting demo {}", &demo_name);
    let mut demos_cache = state.demo_cache.lock().expect("Failed to lock mutex");
    let demo = demos_cache
        .demos
        .get_mut(&demo_name)
        .ok_or(DemoCommandError::DemoNotFound)?;

    if trash {
        trash::delete(&demo.path).or(Err(DemoCommandError::FileDeleteFailed))?;

        if let Err(e) = trash::delete(demo.path.with_extension("json")) {
            if let trash::Error::CouldNotAccess { target: _ } = e {
                // We don't care if the file was not found
                // because the demo has no JSON file.
            } else {
                return Err(DemoCommandError::OtherIOError);
            }
        }
    } else {
        std::fs::remove_file(&demo.path).or(Err(DemoCommandError::FileDeleteFailed))?;

        if let Err(e) = std::fs::remove_file(demo.path.with_extension("json")) {
            if e.kind() == std::io::ErrorKind::NotFound {
                // We don't care if the file was not found
                // because the demo has no JSON file.
            } else {
                return Err(DemoCommandError::OtherIOError);
            }
        }
    }
    demos_cache.demos.remove(&demo_name);

    Ok(())
}

#[tauri::command]
pub fn rename_demo(
    demo_name: String,
    new_name: String,
    state: State<'_, AppState>,
) -> Result<(), DemoCommandError> {
    let mut demos_cache = state.demo_cache.lock().expect("Failed to lock mutex");
    let mut demo = demos_cache
        .demos
        .remove(&demo_name)
        .ok_or(DemoCommandError::DemoNotFound)?;

    let new_path = demo.path.with_file_name(&new_name);

    std::fs::rename(&demo.path, &new_path).or(Err(DemoCommandError::FileRenameFailed))?;
    if let Err(e) = std::fs::rename(
        demo.path.with_extension("json"),
        new_path.with_extension("json"),
    ) {
        // We don't care if the file was not found
        // because the demo has no JSON file.
        if e.kind() != std::io::ErrorKind::NotFound {
            return Err(DemoCommandError::OtherIOError);
        }
    }

    demo.name = new_name.clone();
    demo.path = new_path;

    demos_cache.demos.insert(new_name, demo);

    Ok(())
}

#[tauri::command]
pub fn get_demo_by_name(
    demo_name: String,
    state: State<'_, AppState>,
) -> Result<Demo, DemoCommandError> {
    let demos_cache = state.demo_cache.lock().expect("Failed to lock mutex");
    Ok(demos_cache
        .demos
        .get(&demo_name)
        .ok_or(DemoCommandError::DemoNotFound)?
        .clone())
}

#[tauri::command]
pub async fn get_demo_details(demo_path: String) -> Result<GameSummary, DemoCommandError> {
    let file = std::fs::read(demo_path).or(Err(DemoCommandError::FileReadFailed))?;
    let demo = tf_demo_parser::Demo::new(&file);

    // TODO:
    // Construct the parser with arguments from the frontend
    // which specify the type of events to look for, or other options.

    let analyser = GameDetailsAnalyser::default();

    let parser = tf_demo_parser::DemoParser::new_all_with_analyser(demo.get_stream(), analyser);
    let (_header, state) = parser.parse().or(Err(DemoCommandError::ParsingFailed))?;

    Ok(state)
}
