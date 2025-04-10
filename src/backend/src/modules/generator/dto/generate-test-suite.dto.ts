export class GenerateTestSuiteDto {
  codeId: string;
  testRequirements: {
    types: ('unit' | 'integration' | 'e2e' | 'performance' | 'security')[];
    framework?: string;
    coverage?: {
      target: number;
      includeEdgeCases: boolean;
    };
    focus?: string[];
    includeDocumentation?: boolean;
  };
}
