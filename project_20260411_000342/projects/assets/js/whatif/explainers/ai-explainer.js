export class WhatIfAIExplainer {
  constructor(provider) {
    this.provider = provider;
  }

  async explain(result) {
    if (!this.provider || typeof this.provider.generateExplanation !== 'function') {
      throw new Error('AI explanation provider is required');
    }

    return this.provider.generateExplanation(result);
  }
}