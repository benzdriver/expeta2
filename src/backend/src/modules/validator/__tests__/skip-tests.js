beforeEach(() => {
  jest.setTimeout(30000);
});

jest.mock('../../semantic-mediator/semantic-mediator.service', () => ({
  SemanticMediatorService: jest.fn().mockImplementation(() => ({
    generateValidationContext: jest.fn().mockResolvedValue({
      semanticContext: {
        codeFeatures: { complexity: 'low' },
        semanticRelationship: { alignment: 'high' }
      }
    }),
    enrichWithContext: jest.fn().mockImplementation((_, data) => Promise.resolve(data)),
    translateBetweenModules: jest.fn().mockResolvedValue('test prompt'),
    trackSemanticTransformation: jest.fn().mockResolvedValue({}),
    transformData: jest.fn().mockResolvedValue('test prompt')
  }))
}));

jest.mock('../../memory/memory.service', () => ({
  MemoryService: jest.fn().mockImplementation(() => ({
    getMemoryByType: jest.fn().mockResolvedValue([]),
    storeMemory: jest.fn().mockResolvedValue({}),
    getRelatedMemories: jest.fn().mockResolvedValue([])
  }))
}));
