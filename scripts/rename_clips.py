#!/usr/bin/env python3
"""Rename hockey clips based on tag mappings."""

import json
import shutil
import sys
from pathlib import Path


def build_filename(mapping: dict, original_name: str, ext: str) -> str:
    """Build the renamed filename from tag data.

    Format: [Line] Line [Player] [Tag] [Custom] IMG_NNNN.[ext]
    Examples:
        Red Line Izzy Goal IMG_5628.MOV
        Red Line Save IMG_5630.MOV
        Ava So Close IMG_5644.MOV
        Clip IMG_5640.MOV
    """
    # Extract IMG_NNNN from original name (e.g. "Copy of IMG_5628.MOV" -> "IMG_5628")
    import re
    img_match = re.search(r"(IMG_\d+)", original_name)
    img_id = img_match.group(1) if img_match else Path(original_name).stem

    parts = []

    line = mapping.get("line")
    player = mapping.get("player")
    tag = mapping.get("tag")
    custom = mapping.get("custom")

    if line:
        parts.append(f"{line} Line")
    if player:
        parts.append(player)
    if tag:
        parts.append(tag)
    elif not line and not player:
        parts.append("Clip")
    if custom:
        parts.append(custom)

    if not parts:
        parts.append("Clip")

    parts.append(img_id)
    return " ".join(parts) + ext


def rename_clips(mapping_file: str, source_dir: str, output_dir: str) -> None:
    """Read mappings, copy and rename files from source to output."""
    mapping_path = Path(mapping_file)
    source = Path(source_dir)
    output = Path(output_dir)

    with open(mapping_path) as f:
        game = json.load(f)

    description = game["description"]
    mappings = game["mappings"]

    # Create game subfolder
    game_folder = output / description
    game_folder.mkdir(parents=True, exist_ok=True)

    # Sort by original filename for sequencing
    sorted_files = sorted(mappings.keys())

    print(f"Game: {description}")
    print(f"Output: {game_folder}")
    print(f"Files: {len(sorted_files)}")
    print("-" * 50)

    renamed = 0
    skipped = 0
    missing = 0

    for seq, original_name in enumerate(sorted_files, start=1):
        source_file = source / original_name
        if not source_file.exists():
            print(f"  MISSING: {original_name}")
            missing += 1
            continue

        ext = source_file.suffix  # .MOV
        tags = mappings[original_name]
        new_name = build_filename(tags, original_name, ext)
        dest = game_folder / new_name

        shutil.copy2(source_file, dest)
        print(f"  {original_name} -> {new_name}")
        renamed += 1

    # Save mapping JSON into the game folder
    mapping_dest = game_folder / f"{description}.json"
    shutil.copy2(mapping_path, mapping_dest)
    print(f"  Mapping saved: {description}.json")

    print("-" * 50)
    print(f"Done: {renamed} renamed, {missing} missing, {len(sorted_files) - renamed - missing} skipped")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python rename_clips.py <mapping.json> <source_dir> <output_dir>")
        sys.exit(1)

    rename_clips(sys.argv[1], sys.argv[2], sys.argv[3])
