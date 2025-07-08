export interface VisualizerConfig {
  sensitivity: number; // 0-1, how sensitive to audio levels
  smoothing: number;   // 0-1, how much to smooth between updates
  minLevel: number;    // Minimum level to register
  maxLevel: number;    // Maximum level for scaling
}

export class AudioVisualizerService {
  private config: VisualizerConfig;
  private currentLevel: number = 0;
  private smoothedLevel: number = 0;
  private isActive: boolean = false;

  constructor(config: Partial<VisualizerConfig> = {}) {
    this.config = {
      sensitivity: 0.8,
      smoothing: 0.3,
      minLevel: 0.01,
      maxLevel: 0.8,
      ...config
    };
  }

  /**
   * Update audio level and return smoothed visualization data
   */
  updateLevel(rawLevel: number): number {
    if (!this.isActive) return 0;

    // Apply sensitivity scaling
    const scaledLevel = Math.min(rawLevel * this.config.sensitivity, 1);
    
    // Apply min/max thresholds
    const thresholdLevel = scaledLevel < this.config.minLevel ? 0 : 
                          scaledLevel > this.config.maxLevel ? 1 : 
                          (scaledLevel - this.config.minLevel) / (this.config.maxLevel - this.config.minLevel);

    // Apply smoothing
    this.smoothedLevel = this.smoothedLevel * (1 - this.config.smoothing) + 
                         thresholdLevel * this.config.smoothing;

    this.currentLevel = thresholdLevel;
    return this.smoothedLevel;
  }

  /**
   * Start visualization
   */
  start(): void {
    this.isActive = true;
    this.currentLevel = 0;
    this.smoothedLevel = 0;
  }

  /**
   * Stop visualization
   */
  stop(): void {
    this.isActive = false;
    this.currentLevel = 0;
    this.smoothedLevel = 0;
  }

  /**
   * Get current level (raw)
   */
  getCurrentLevel(): number {
    return this.currentLevel;
  }

  /**
   * Get smoothed level for display
   */
  getSmoothedLevel(): number {
    return this.smoothedLevel;
  }

  /**
   * Get level as percentage (0-100)
   */
  getLevelPercentage(): number {
    return Math.round(this.smoothedLevel * 100);
  }

  /**
   * Get level category for UI feedback
   */
  getLevelCategory(): 'silent' | 'quiet' | 'normal' | 'loud' | 'very_loud' {
    const level = this.smoothedLevel;
    
    if (level < 0.1) return 'silent';
    if (level < 0.3) return 'quiet';
    if (level < 0.6) return 'normal';
    if (level < 0.8) return 'loud';
    return 'very_loud';
  }

  /**
   * Get visual scale for different UI elements
   */
  getVisualScale(baseSize: number = 1, maxScale: number = 1.5): number {
    const scale = baseSize + (this.smoothedLevel * (maxScale - baseSize));
    return Math.max(baseSize, Math.min(maxScale, scale));
  }

  /**
   * Get color intensity for visual feedback
   */
  getColorIntensity(): number {
    // Returns 0-1 value for color intensity/opacity
    return Math.max(0.2, this.smoothedLevel); // Minimum 20% opacity
  }

  /**
   * Generate CSS transform for pulse effect
   */
  getPulseTransform(baseScale: number = 1): string {
    const scale = this.getVisualScale(baseScale, baseScale + 0.3);
    return `scale(${scale.toFixed(3)})`;
  }

  /**
   * Generate CSS filter for glow effect
   */
  getGlowFilter(baseColor: string = '#3b82f6'): string {
    const intensity = this.getColorIntensity();
    const blur = Math.round(intensity * 10);
    return `drop-shadow(0 0 ${blur}px ${baseColor})`;
  }

  /**
   * Check if currently speaking (above threshold)
   */
  isSpeaking(): boolean {
    return this.isActive && this.smoothedLevel > 0.15;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<VisualizerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}