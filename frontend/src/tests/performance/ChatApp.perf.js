const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const assert = require('assert');

describe('Chat Application Performance Tests', function() {
  let driver;
  
  // Increase timeout for performance tests
  this.timeout(60000);

  beforeEach(async function() {
    const options = new chrome.Options();
    options.addArguments('--headless');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.setPerfLoggingPrefs({
      enableNetwork: true,
      enablePage: true,
      traceCategories: 'browser,devtools.timeline,devtools'
    });
    options.setLoggingPrefs({ performance: 'ALL', browser: 'ALL' });

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    await driver.get('http://localhost:3000');
  });

  afterEach(async function() {
    await driver.quit();
  });

  async function measureTiming(action) {
    const start = Date.now();
    await action();
    return Date.now() - start;
  }

  async function getPerformanceLogs() {
    const logs = await driver.manage().logs().get('performance');
    return logs.map(log => JSON.parse(log.message).message)
      .filter(entry => entry.method === 'Network.responseReceived');
  }

  it('measures initial load time', async function() {
    const loadTime = await measureTiming(async () => {
      await driver.wait(until.elementLocated(By.css('.MuiPaper-root')), 10000);
    });
    
    console.log(`Initial load time: ${loadTime}ms`);
    assert(loadTime < 5000, 'Initial load time should be less than 5 seconds');
  });

  it('measures message sending latency', async function() {
    const messageInput = await driver.findElement(By.css('textarea'));
    
    const sendLatency = await measureTiming(async () => {
      await messageInput.sendKeys('Test message');
      await messageInput.sendKeys(Key.RETURN);
      await driver.wait(until.elementLocated(By.css('.message-content')), 10000);
    });
    
    console.log(`Message send latency: ${sendLatency}ms`);
    assert(sendLatency < 2000, 'Message send latency should be less than 2 seconds');
  });

  it('measures model switching performance', async function() {
    const modelSelect = await driver.findElement(By.css('.MuiSelect-select'));
    
    const switchTime = await measureTiming(async () => {
      await modelSelect.click();
      const option = await driver.findElement(By.xpath("//li[contains(text(), 'Qwen')]"));
      await option.click();
      await driver.wait(until.elementLocated(By.css(`img[alt*="Qwen"]`)), 5000);
    });
    
    console.log(`Model switch time: ${switchTime}ms`);
    assert(switchTime < 1000, 'Model switching should take less than 1 second');
  });

  it('measures conversation loading performance', async function() {
    // First, create some conversations
    const messageInput = await driver.findElement(By.css('textarea'));
    for (let i = 0; i < 5; i++) {
      await messageInput.sendKeys(`Test message ${i}`);
      await messageInput.sendKeys(Key.RETURN);
      await driver.sleep(500);
    }

    // Measure conversation switch time
    const switchTime = await measureTiming(async () => {
      const newChatButton = await driver.findElement(By.css('[aria-label="New Chat"]'));
      await newChatButton.click();
      await driver.wait(until.elementLocated(By.xpath("//div[text()='New Chat']")), 5000);
    });
    
    console.log(`Conversation switch time: ${switchTime}ms`);
    assert(switchTime < 500, 'Conversation switching should take less than 500ms');
  });

  it('measures memory usage during long conversations', async function() {
    const messageInput = await driver.findElement(By.css('textarea'));
    const initialMemory = await driver.executeScript('return window.performance.memory.usedJSHeapSize');
    
    // Generate a long conversation
    for (let i = 0; i < 50; i++) {
      await messageInput.sendKeys(`Test message ${i} with some additional content to make it longer`);
      await messageInput.sendKeys(Key.RETURN);
      await driver.sleep(100);
    }

    const finalMemory = await driver.executeScript('return window.performance.memory.usedJSHeapSize');
    const memoryIncrease = finalMemory - initialMemory;
    
    console.log(`Memory increase: ${memoryIncrease / 1024 / 1024}MB`);
    assert(memoryIncrease < 50 * 1024 * 1024, 'Memory increase should be less than 50MB');
  });

  it('measures streaming response performance', async function() {
    const messageInput = await driver.findElement(By.css('textarea'));
    await messageInput.sendKeys('Generate a long response');
    await messageInput.sendKeys(Key.RETURN);

    let lastUpdateTime = Date.now();
    let updateIntervals = [];

    // Measure streaming update intervals
    for (let i = 0; i < 10; i++) {
      await driver.wait(async () => {
        const content = await driver.findElement(By.css('.message-content')).getText();
        if (content.length > i * 10) {
          const now = Date.now();
          updateIntervals.push(now - lastUpdateTime);
          lastUpdateTime = now;
          return true;
        }
        return false;
      }, 10000);
    }

    const avgInterval = updateIntervals.reduce((a, b) => a + b) / updateIntervals.length;
    console.log(`Average streaming update interval: ${avgInterval}ms`);
    assert(avgInterval < 200, 'Average streaming update interval should be less than 200ms');
  });

  it('measures UI responsiveness during heavy load', async function() {
    const messageInput = await driver.findElement(By.css('textarea'));
    
    // Start a long streaming response
    await messageInput.sendKeys('Generate a very long response');
    await messageInput.sendKeys(Key.RETURN);

    // Measure UI interaction times during streaming
    const interactionTimes = [];
    for (let i = 0; i < 5; i++) {
      const time = await measureTiming(async () => {
        await messageInput.sendKeys('Test');
        await messageInput.clear();
      });
      interactionTimes.push(time);
      await driver.sleep(100);
    }

    const avgInteractionTime = interactionTimes.reduce((a, b) => a + b) / interactionTimes.length;
    console.log(`Average UI interaction time during streaming: ${avgInteractionTime}ms`);
    assert(avgInteractionTime < 100, 'UI should remain responsive during streaming');
  });

  it('measures network efficiency', async function() {
    const messageInput = await driver.findElement(By.css('textarea'));
    await messageInput.sendKeys('Test message');
    await messageInput.sendKeys(Key.RETURN);

    const logs = await getPerformanceLogs();
    const totalBytes = logs.reduce((sum, log) => {
      return sum + (log.params?.response?.encodedDataLength || 0);
    }, 0);

    console.log(`Total network bytes: ${totalBytes}`);
    assert(totalBytes < 1024 * 1024, 'Network payload should be less than 1MB');
  });
}); 