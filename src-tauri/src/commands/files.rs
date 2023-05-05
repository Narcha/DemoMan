use serde::Serialize;
use steamlocate::SteamDir;
use tauri::State;

use crate::AppState;

#[derive(Clone, Debug, Serialize)]
pub enum TF2DirError {
    /// Could not find Steam installed on the current system
    SteamNotFound,
    /// Found Steam, but could not find TF2 within the Steam installation directory
    Tf2NotFound,
}

#[tauri::command]
pub fn get_tf2_dir(_state: State<'_, AppState>) -> Result<String, TF2DirError> {
    const TF2_ID: u32 = 440;

    let mut steam_dir = SteamDir::locate().ok_or(TF2DirError::SteamNotFound)?;
    let tf2_dir = steam_dir.app(&TF2_ID).ok_or(TF2DirError::Tf2NotFound)?;

    Ok(String::from(tf2_dir.path.to_string_lossy()))
}
