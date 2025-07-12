#!/usr/bin/env python3
"""
Clean Claude Code history to prevent config file from growing too large.

This script removes old chat history from ~/.claude.json while preserving
all other configuration settings.
"""

import json
import os
import shutil
from datetime import datetime
from pathlib import Path

def clean_claude_history(max_entries_per_project=10, backup=True):
    """
    Clean Claude Code chat history from config file.
    
    Args:
        max_entries_per_project: Maximum history entries to keep per project
        backup: Whether to create a backup before cleaning
    """
    config_path = Path.home() / '.claude.json'
    
    if not config_path.exists():
        print("No Claude config file found")
        return
    
    # Create backup if requested
    if backup:
        backup_path = config_path.with_suffix(f'.json.backup-{datetime.now().strftime("%Y%m%d-%H%M%S")}')
        shutil.copy2(config_path, backup_path)
        print(f"Created backup: {backup_path}")
    
    # Load current config
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
    except Exception as e:
        print(f"Error reading config: {e}")
        return
    
    # Clean history from each project
    projects = config.get('projects', {})
    total_removed = 0
    
    for project_path, project_data in projects.items():
        history = project_data.get('history', [])
        original_count = len(history)
        
        if original_count > max_entries_per_project:
            # Keep only the most recent entries
            project_data['history'] = history[-max_entries_per_project:]
            removed_count = original_count - max_entries_per_project
            total_removed += removed_count
            print(f"Project {project_path}: removed {removed_count} entries ({original_count} → {max_entries_per_project})")
        else:
            print(f"Project {project_path}: {original_count} entries (no cleanup needed)")
    
    if total_removed > 0:
        # Save cleaned config
        try:
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
            
            # Check file size
            size_mb = config_path.stat().st_size / (1024 * 1024)
            print(f"✅ Cleaned config saved. File size: {size_mb:.2f} MB")
            print(f"Total history entries removed: {total_removed}")
            
        except Exception as e:
            print(f"Error saving cleaned config: {e}")
    else:
        print("No cleanup needed")

def check_config_size():
    """Check current config file size and warn if too large."""
    config_path = Path.home() / '.claude.json'
    
    if not config_path.exists():
        return
    
    size_mb = config_path.stat().st_size / (1024 * 1024)
    print(f"Current config file size: {size_mb:.2f} MB")
    
    if size_mb > 1:
        print("⚠️  Config file is large, consider running cleanup")
        return True
    return False

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Clean Claude Code chat history')
    parser.add_argument('--max-entries', type=int, default=10, 
                       help='Maximum history entries to keep per project (default: 10)')
    parser.add_argument('--no-backup', action='store_true',
                       help='Skip creating backup file')
    parser.add_argument('--check-only', action='store_true',
                       help='Only check file size, don\'t clean')
    
    args = parser.parse_args()
    
    if args.check_only:
        check_config_size()
    else:
        print(f"Cleaning Claude Code history (keeping {args.max_entries} entries per project)...")
        clean_claude_history(
            max_entries_per_project=args.max_entries,
            backup=not args.no_backup
        )