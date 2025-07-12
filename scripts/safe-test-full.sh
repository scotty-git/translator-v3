#!/bin/bash
# safe-test-full.sh - Sanitizes output but keeps ALL lines
# Replaces problematic Unicode characters with safe ASCII equivalents
npx playwright test "$@" 2>&1 | sed '
s/🏠/[HOST]/g
s/👥/[GUEST]/g
s/⎿/-/g
s/§/[S]/g
s/📱/[PHONE]/g
s/🔊/[SOUND]/g
s/📊/[CHART]/g
s/🎯/[TARGET]/g
s/✅/[CHECK]/g
s/❌/[X]/g
s/⚠️/[WARN]/g
s/🔍/[SEARCH]/g
s/📋/[CLIP]/g
s/💾/[SAVE]/g
s/🌐/[WEB]/g
s/🔗/[LINK]/g
s/📡/[SIGNAL]/g
s/🔌/[PLUG]/g
s/📦/[BOX]/g
s/🧹/[CLEAN]/g
s/📚/[BOOKS]/g
s/📭/[MAIL]/g
s/🔄/[SYNC]/g
s/👋/[WAVE]/g
s/🚀/[ROCKET]/g
s/🎵/[MUSIC]/g
s/🍎/[APPLE]/g
s/⌨️/[KEYBOARD]/g
s/♿/[ACCESS]/g
s/🔤/[FONT]/g
s/🔧/[TOOL]/g
s/📍/[PIN]/g
s/👤/[USER]/g
'