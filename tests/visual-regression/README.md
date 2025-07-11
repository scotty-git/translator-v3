# Visual Regression Testing System

## 🎯 Purpose

This testing system prevents unauthorized UI changes during refactoring by capturing baseline screenshots and comparing them against current implementations.

## 📁 Directory Structure

```
tests/visual-regression/
├── README.md                 # This file
├── ui-contract.spec.ts       # Main test suite
├── global-setup.ts           # Test environment setup
├── global-teardown.ts        # Test environment cleanup
└── screenshots/              # Baseline screenshots (auto-generated)
    ├── solo-light-desktop.png
    ├── solo-dark-desktop.png
    ├── session-creation-light-desktop.png
    └── ... (other baselines)
```

## 🚨 Critical Commands

### Before Refactoring
```bash
# Establish baseline screenshots
npm run ui:baseline

# Commit baselines to git
git add tests/visual-regression/screenshots/
git commit -m "docs: establish UI baseline before refactoring"
```

### During Refactoring
```bash
# Validate UI preservation (run frequently)
npm run ui:validate

# Full visual regression check
npm run test:visual
```

### After Refactoring
```bash
# Final validation
npm run test:visual

# Generate detailed report
npm run test:visual:report
```

## 📋 Test Coverage

### Solo Translator Mode
- Light/dark themes
- Desktop/mobile viewports
- With/without messages
- Recording states
- Error states

### Session Translator Mode
- Session creation screen
- Session join screen
- Host/guest views
- Partner connection states

### Home Screen
- Light/dark themes
- Desktop/mobile viewports
- Navigation elements

### Component States
- Language selectors
- Mode toggles
- Error displays
- Loading states

## 🔧 Configuration

### Playwright Config
- **File**: `playwright.visual.config.ts`
- **Browsers**: Chromium, WebKit, Mobile Chrome, Mobile Safari
- **Threshold**: 5% difference allowed
- **Animations**: Disabled for consistency

### Environment
- **Dev Server**: Must be running at `http://127.0.0.1:5173`
- **Viewport**: Standardized sizes for consistency
- **Themes**: Both light and dark tested

## 🚨 Troubleshooting

### Common Issues

#### Dev Server Not Running
```bash
# Error: Connection refused
# Solution: Start dev server
npm run dev
```

#### Screenshots Don't Match
```bash
# View differences
npm run test:visual:report

# If changes are accidental: revert code
# If changes are intentional: update baselines
npm run ui:baseline
```

#### Tests Timeout
```bash
# Increase timeout in playwright.visual.config.ts
# Or check if app is loading slowly
```

### Debugging
```bash
# Run tests with debug mode
npm run test:visual:debug

# This opens browser to see what's happening
```

## 📊 Success Metrics

### Passing Tests
- All screenshots match baselines within 5% threshold
- No visual regressions detected
- UI contract preserved

### Failing Tests
- Screenshots show visual differences
- UI elements moved or changed
- Theme inconsistencies detected

## 🔄 Maintenance

### Regular Tasks
- **Monthly**: Review baseline accuracy
- **Quarterly**: Update test coverage
- **After UI Changes**: Update baselines

### Baseline Updates
```bash
# Only run when UI changes are intentional and approved
npm run ui:baseline
```

## 📝 Best Practices

### For Developers
1. **Always validate** before committing
2. **Fix regressions immediately** when detected
3. **Understand the difference** between accidental and intentional changes
4. **Use bypass flags carefully** - only for approved changes

### For Code Reviews
1. **Check for screenshot changes** in PRs
2. **Verify UI change approval** if baselines updated
3. **Ensure documentation** explains UI changes
4. **Validate test results** before merging

## 🛡️ Integration

### Git Hooks
- **Pre-commit**: Automatic UI validation
- **Bypass**: Use `[skip-ui-validation]` in commit message
- **UI Changes**: Use `[ui-change]` for intentional changes

### CI/CD
- **Pull Requests**: Must pass visual regression tests
- **Builds**: Fail if UI regressions detected
- **Deployments**: Blocked by failing visual tests

## 📚 Related Documentation

- [UI Contract Documentation](../../docs/ui-contract.md)
- [Phase 2B Documentation](../../docs/refactor/phase-2b-solo-translator.md)
- [Phase 2C Documentation](../../docs/refactor/phase-2c-session-refactor.md)

---

*This system ensures refactoring improves code architecture without compromising user experience.*