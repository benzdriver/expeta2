export class GenerateProjectStructureDto {
  expectationId: string;
  techStack: {
    language: string;
    framework: string;
    libraries?: string[];
    buildTools?: string[];
    testingFrameworks?: string[];
    deploymentPlatforms?: string[];
  };
  options?: {
    includeTests?: boolean;
    includeDocumentation?: boolean;
    includeDeploymentConfig?: boolean;
    architecturePattern?: string;
    codeStyle?: string;
  };
}
