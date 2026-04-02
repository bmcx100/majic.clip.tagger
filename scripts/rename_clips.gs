// ==== CONFIGURATION ====
const SOURCE_FOLDER_ID = "1OKbt3ThRACnSCW2jWxzfZcOQ4wHh1lxH";
const LOG_SHEET_ID = "1xaKOA5QPDInchMhvCK2BNkLAVPfyzpHm46LaFSQUtV0";

// ==== WEB APP ====
function doGet() {
  const results = renameClips();
  const html = buildResultsPage(results);
  return HtmlService.createHtmlOutput(html)
    .setTitle("Hockey Clip Renamer");
}

function buildResultsPage(results) {
  if (results.length === 0) {
    return "<html><body style='font-family:sans-serif;padding:24px;'>"
      + "<h2>No JSON files found</h2>"
      + "<p>Upload a mapping JSON to the uploads folder and try again.</p>"
      + "</body></html>";
  }

  let rows = "";
  for (const r of results) {
    const color = r.renamed === r.total ? "#22c55e" : "#f59e0b";
    rows += "<tr>"
      + "<td style='padding:8px;'>" + r.game + "</td>"
      + "<td style='padding:8px;'><span style='color:" + color + ";font-weight:bold;'>" + r.renamed + " of " + r.total + "</span></td>"
      + "</tr>";
  }

  return "<html><body style='font-family:sans-serif;padding:24px;'>"
    + "<h2>Done!</h2>"
    + "<table style='border-collapse:collapse;'>"
    + "<tr><th style='padding:8px;text-align:left;'>Game</th><th style='padding:8px;text-align:left;'>Files</th></tr>"
    + rows
    + "</table>"
    + "<p style='margin-top:16px;color:#888;'>Tap to run again anytime.</p>"
    + "</body></html>";
}

// ==== MAIN ====
function renameClips() {
  const sourceFolder = DriveApp.getFolderById(SOURCE_FOLDER_ID);

  // Collect all JSON mapping files in the folder
  const mappingFiles = [];
  const allFiles = sourceFolder.getFiles();
  while (allFiles.hasNext()) {
    const f = allFiles.next();
    if (f.getName().endsWith(".json")) {
      mappingFiles.push(f);
    }
  }

  if (mappingFiles.length === 0) {
    Logger.log("ERROR: No mapping JSON files found in folder.");
    return [];
  }

  Logger.log("Found " + mappingFiles.length + " mapping file(s).\n");

  const results = [];
  for (const mappingFile of mappingFiles) {
    results.push(processMapping(mappingFile, sourceFolder));
    Logger.log("");
  }
  return results;
}

function processMapping(mappingFile, sourceFolder) {
  const game = JSON.parse(mappingFile.getBlob().getDataAsString());
  const description = game.description;
  const mappings = game.mappings;
  const filenames = Object.keys(mappings).sort();

  // Create game subfolder
  const gameFolder = getOrCreateSubfolder(sourceFolder, description);

  Logger.log("Game: " + description);
  Logger.log("Files: " + filenames.length);
  Logger.log("--------------------------------------------------");

  let renamed = 0;
  let missing = 0;

  for (const originalName of filenames) {
    const file = findFile(sourceFolder, originalName);
    if (!file) {
      Logger.log("  MISSING: " + originalName);
      missing++;
      continue;
    }

    const ext = getExtension(originalName);
    const newName = buildFilename(mappings[originalName], originalName, ext);

    file.setName(newName);
    file.moveTo(gameFolder);
    Logger.log("  " + originalName + " -> " + newName);
    renamed++;
  }

  // Move the mapping JSON into the game folder too
  mappingFile.moveTo(gameFolder);
  Logger.log("  Mapping moved to: " + description + "/");

  // Log to Google Sheet
  const total = filenames.length;
  const now = new Date();
  const complete = renamed === total ? "Yes" : "No";
  const sheet = SpreadsheetApp.openById(LOG_SHEET_ID).getActiveSheet();
  sheet.appendRow([
    Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd"),
    Utilities.formatDate(now, Session.getScriptTimeZone(), "HH:mm:ss"),
    mappingFile.getName(),
    complete,
    renamed,
    total
  ]);
  Logger.log("  Logged to sheet");

  // Move the game folder up to Mary's folder (parent of uploads)
  const parents = sourceFolder.getParents();
  if (parents.hasNext()) {
    const marysFolder = parents.next();
    gameFolder.moveTo(marysFolder);
    Logger.log("  Moved folder to: " + marysFolder.getName() + "/" + description + "/");
  }

  Logger.log("--------------------------------------------------");
  Logger.log("Done: " + renamed + " renamed, " + missing + " missing");

  return { game: description, renamed: renamed, total: total };
}

function buildFilename(mapping, originalName, ext) {
  // Extract IMG_NNNN from original name
  const imgMatch = originalName.match(/(IMG_\d+)/);
  const imgId = imgMatch ? imgMatch[1] : originalName.replace(/\.[^.]+$/, "");

  const parts = [];

  const line = mapping.line;
  const player = mapping.player;
  const tag = mapping.tag;
  const custom = mapping.custom;

  if (line) parts.push(line + " Line");
  if (player) parts.push(player);
  if (tag) {
    parts.push(tag);
  } else if (!line && !player) {
    parts.push("Clip");
  }
  if (custom) parts.push(custom);

  if (parts.length === 0) parts.push("Clip");

  parts.push(imgId);
  return parts.join(" ") + ext;
}

function findFile(folder, name) {
  const files = folder.getFilesByName(name);
  return files.hasNext() ? files.next() : null;
}

function getOrCreateSubfolder(parent, name) {
  const folders = parent.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return parent.createFolder(name);
}

function getExtension(filename) {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.substring(dot) : "";
}
