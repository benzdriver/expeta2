export class RefactorCodeDto {
  codeId: string;
  refactoringGoals: {
    structuralImprovements?: string[];
    designPatterns?: string[];
    performanceOptimizations?: string[];
    errorHandling?: boolean;
    namingConventions?: boolean;
    codeStyle?: string;
    focus?: string[];
  };
}
