/**
 * Story 4.0c: Validation Framework Core Classes
 * ValidationResult and ValidationViolation - Core validation result types
 */

export type ValidationCategory = 'completeness' | 'freshness' | 'consistency' | 'anomaly' | 'sequential';
export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationViolation {
  category: ValidationCategory;
  severity: ValidationSeverity;
  message: string;
  code: string;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

export interface ValidationContext {
  source?: string;
  symbol?: string;
  dataType?: string;
  timestamp?: Date;
  [key: string]: any;
}

/**
 * ValidationResult - Aggregates validation violations and calculates quality scores
 */
export class ValidationResult {
  private violations: ValidationViolation[] = [];
  private startTime: Date;
  private endTime?: Date;

  constructor() {
    this.startTime = new Date();
  }

  /**
   * Add error-level violation
   */
  addError(violation: Omit<ValidationViolation, 'severity' | 'timestamp'>): void {
    this.violations.push({
      ...violation,
      severity: 'error',
      timestamp: new Date(),
    });
  }

  /**
   * Add warning-level violation
   */
  addWarning(violation: Omit<ValidationViolation, 'severity' | 'timestamp'>): void {
    this.violations.push({
      ...violation,
      severity: 'warning',
      timestamp: new Date(),
    });
  }

  /**
   * Add info-level violation
   */
  addInfo(violation: Omit<ValidationViolation, 'severity' | 'timestamp'>): void {
    this.violations.push({
      ...violation,
      severity: 'info',
      timestamp: new Date(),
    });
  }

  /**
   * Add violation with explicit severity
   */
  addViolation(violation: Omit<ValidationViolation, 'timestamp'>): void {
    this.violations.push({
      ...violation,
      timestamp: new Date(),
    });
  }

  /**
   * Merge another ValidationResult into this one
   */
  merge(other: ValidationResult): void {
    this.violations.push(...other.violations);
  }

  /**
   * Check if validation passed (no errors)
   */
  isValid(): boolean {
    return !this.hasErrors();
  }

  /**
   * Check if validation has any errors
   */
  hasErrors(): boolean {
    return this.violations.some((v) => v.severity === 'error');
  }

  /**
   * Check if validation has critical errors (for emergency scenarios)
   */
  hasCriticalErrors(): boolean {
    // Critical errors are errors in critical categories or with specific codes
    return this.violations.some(
      (v) =>
        v.severity === 'error' &&
        (v.category === 'consistency' || v.code === 'MISSING_FIELDS' || v.code === 'BROKEN_REFERENCES')
    );
  }

  /**
   * Get all violations
   */
  getViolations(): ValidationViolation[] {
    return [...this.violations];
  }

  /**
   * Get errors only
   */
  getErrors(): ValidationViolation[] {
    return this.violations.filter((v) => v.severity === 'error');
  }

  /**
   * Get warnings only
   */
  getWarnings(): ValidationViolation[] {
    return this.violations.filter((v) => v.severity === 'warning');
  }

  /**
   * Get info violations only
   */
  getInfo(): ValidationViolation[] {
    return this.violations.filter((v) => v.severity === 'info');
  }

  /**
   * Get violations by category
   */
  getByCategory(category: ValidationCategory): ValidationViolation[] {
    return this.violations.filter((v) => v.category === category);
  }

  /**
   * Calculate quality score (0 to 1)
   * Errors: -0.1 per error
   * Warnings: -0.01 per warning
   * Info: no impact
   */
  calculateScore(): number {
    const errorCount = this.getErrors().length;
    const warningCount = this.getWarnings().length;

    let score = 1.0;
    score -= errorCount * 0.1;
    score -= warningCount * 0.01;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Get validation duration in milliseconds
   */
  getDuration(): number {
    const end = this.endTime || new Date();
    return end.getTime() - this.startTime.getTime();
  }

  /**
   * Mark validation as complete
   */
  complete(): void {
    this.endTime = new Date();
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    return {
      valid: this.isValid(),
      score: this.calculateScore(),
      totalViolations: this.violations.length,
      errors: this.getErrors().length,
      warnings: this.getWarnings().length,
      info: this.getInfo().length,
      duration: this.getDuration(),
      categories: {
        completeness: this.getByCategory('completeness').length,
        freshness: this.getByCategory('freshness').length,
        consistency: this.getByCategory('consistency').length,
        anomaly: this.getByCategory('anomaly').length,
        sequential: this.getByCategory('sequential').length,
      },
    };
  }

  /**
   * Convert to JSON for storage or API responses
   */
  toJSON() {
    return {
      valid: this.isValid(),
      score: this.calculateScore(),
      violations: this.violations,
      summary: this.getSummary(),
      startTime: this.startTime,
      endTime: this.endTime,
    };
  }

  /**
   * Create a ValidationResult from JSON
   */
  static fromJSON(data: any): ValidationResult {
    const result = new ValidationResult();
    result.violations = data.violations || [];
    result.startTime = data.startTime ? new Date(data.startTime) : new Date();
    result.endTime = data.endTime ? new Date(data.endTime) : undefined;
    return result;
  }
}
