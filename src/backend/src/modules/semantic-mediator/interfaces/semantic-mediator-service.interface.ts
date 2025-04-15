export interface ISemanticMediatorService {
  generateValidationContext(
    expectationId: string,
    codeId: string,
    previousValidations?: string[],
    options?: {
      strategy?: string;
      focusAreas?: string[];
      customWeights?: Record<string, number>;
    }
  ): Promise<any>;
  
  enrichWithContext(
    module: string,
    data: any,
    context?: string
  ): Promise<any>;
  
  translateBetweenModules(
    sourceModule: string,
    targetModule: string,
    data: any
  ): Promise<string>;
  
  trackSemanticTransformation(
    sourceModule: string,
    targetModule: string,
    sourceData: any,
    transformedData: any,
    options?: {
      trackDifferences?: boolean;
      analyzeTransformation?: boolean;
      saveToMemory?: boolean;
    }
  ): Promise<any>;
  
  transformData(
    sourceModule: string,
    targetModule: string,
    data: any
  ): Promise<string>;
}
