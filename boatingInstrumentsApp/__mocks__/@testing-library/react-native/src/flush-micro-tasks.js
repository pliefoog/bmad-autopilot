// Mock for React Native Testing Library flush-micro-tasks
// This prevents the setTimeout polyfill issue

const flushMicroTasks = () => {
  return Promise.resolve();
};

export default flushMicroTasks;
