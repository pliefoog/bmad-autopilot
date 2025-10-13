describe('ts-jest smoke test', () => {
  it('should run a basic TypeScript test', () => {
    const a: number = 2;
    expect(a * 2).toBe(4);
  });
});