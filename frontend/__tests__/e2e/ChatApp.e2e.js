const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const assert = require('assert');

describe('Chat Application E2E Tests', () => {
  let driver;
  
  // Increase timeout for E2E tests
  jest.setTimeout(30000);

  beforeEach(async () => {
    // Set up Chrome options
    const options = new chrome.Options();
    options.addArguments('--headless'); // Run in headless mode for CI
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');

    // Create driver
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    // Navigate to app
    await driver.get('http://localhost:3000');
  });

  afterEach(async function() {
    await driver.quit();
  });

  it('loads the application successfully', async function() {
    const title = await driver.getTitle();
    assert.strictEqual(title, 'AI Chat Application');

    const chatWindows = await driver.findElements(By.css('.MuiPaper-root'));
    assert.strictEqual(chatWindows.length, 2); // Verify both chat windows are present
  });

  it('can select a model and send a message', async function() {
    // Wait for models to load
    await driver.wait(until.elementLocated(By.css('.MuiSelect-select')), 5000);
    
    // Select Hermes model
    const modelSelect = await driver.findElement(By.css('.MuiSelect-select'));
    await modelSelect.click();
    await driver.wait(until.elementLocated(By.xpath("//li[contains(text(), 'Hermes')]")), 2000);
    const hermesOption = await driver.findElement(By.xpath("//li[contains(text(), 'Hermes')]"));
    await hermesOption.click();

    // Type and send a message
    const messageInput = await driver.findElement(By.css('textarea'));
    await messageInput.sendKeys('Test message');
    await messageInput.sendKeys(Key.RETURN);

    // Wait for response
    await driver.wait(until.elementLocated(By.css('.message-content')), 10000);
    const response = await driver.findElement(By.css('.message-content'));
    const responseText = await response.getText();
    assert(responseText.length > 0);
  });

  it('can create and switch between conversations', async function() {
    // Click new chat button
    const newChatButton = await driver.findElement(By.css('[aria-label="New Chat"]'));
    await newChatButton.click();

    // Verify new conversation is created
    const conversationSelect = await driver.findElement(By.css('.MuiSelect-select'));
    const selectedConversation = await conversationSelect.getText();
    assert.strictEqual(selectedConversation, 'New Chat');
  });

  it('can use emoji picker', async function() {
    // Open emoji picker
    const emojiButton = await driver.findElement(By.css('[aria-label="emoji"]'));
    await emojiButton.click();

    // Wait for emoji picker to open
    await driver.wait(until.elementLocated(By.css('.EmojiPickerReact')), 2000);
    
    // Select an emoji
    const emoji = await driver.findElement(By.css('.emoji-picker__emoji'));
    await emoji.click();

    // Verify emoji is added to input
    const messageInput = await driver.findElement(By.css('textarea'));
    const inputValue = await messageInput.getAttribute('value');
    assert(inputValue.length > 0);
  });

  it('handles file upload for supported models', async function() {
    // Select Hermes model first
    const modelSelect = await driver.findElement(By.css('.MuiSelect-select'));
    await modelSelect.click();
    await driver.wait(until.elementLocated(By.xpath("//li[contains(text(), 'Hermes')]")), 2000);
    const hermesOption = await driver.findElement(By.xpath("//li[contains(text(), 'Hermes')]"));
    await hermesOption.click();

    // Prepare file upload
    const filePath = require('path').resolve(__dirname, '../fixtures/test.txt');
    const fileInput = await driver.findElement(By.css('input[type="file"]'));
    await fileInput.sendKeys(filePath);

    // Wait for upload confirmation
    await driver.wait(until.elementLocated(By.xpath("//div[contains(text(), 'Uploaded file')]")), 5000);
  });

  it('handles server errors gracefully', async function() {
    // Select any model
    const modelSelect = await driver.findElement(By.css('.MuiSelect-select'));
    await modelSelect.click();
    const firstOption = await driver.findElement(By.css('.MuiMenuItem-root'));
    await firstOption.click();

    // Stop the server or use invalid URL to trigger error
    await driver.executeScript(`
      window.originalFetch = window.fetch;
      window.fetch = () => Promise.reject(new Error('Failed to fetch'));
    `);

    // Try to send a message
    const messageInput = await driver.findElement(By.css('textarea'));
    await messageInput.sendKeys('Test message');
    await messageInput.sendKeys(Key.RETURN);

    // Verify error message is shown
    await driver.wait(until.elementLocated(By.xpath("//div[contains(text(), 'Unable to get response')]")), 5000);
  });

  it('maintains conversation history', async function() {
    // Send multiple messages
    const messageInput = await driver.findElement(By.css('textarea'));
    
    const messages = ['Message 1', 'Message 2', 'Message 3'];
    for (const message of messages) {
      await messageInput.sendKeys(message);
      await messageInput.sendKeys(Key.RETURN);
      await driver.sleep(1000); // Wait between messages
    }

    // Refresh page
    await driver.navigate().refresh();

    // Verify messages are still present
    const messageElements = await driver.findElements(By.css('.message-content'));
    assert(messageElements.length >= messages.length);
  });

  it('handles multiple chat windows correctly', async function() {
    // Find both chat windows
    const chatWindows = await driver.findElements(By.css('.MuiPaper-root'));
    assert.strictEqual(chatWindows.length, 2);

    // Send message in left window
    const leftInput = await chatWindows[0].findElement(By.css('textarea'));
    await leftInput.sendKeys('Left message');
    await leftInput.sendKeys(Key.RETURN);

    // Send message in right window
    const rightInput = await chatWindows[1].findElement(By.css('textarea'));
    await rightInput.sendKeys('Right message');
    await rightInput.sendKeys(Key.RETURN);

    // Verify messages appear in correct windows
    await driver.wait(until.elementLocated(By.xpath("//div[contains(text(), 'Left message')]")), 5000);
    await driver.wait(until.elementLocated(By.xpath("//div[contains(text(), 'Right message')]")), 5000);
  });

  it('handles keyboard shortcuts', async function() {
    // Test Ctrl+Enter for new line
    const messageInput = await driver.findElement(By.css('textarea'));
    await messageInput.sendKeys(Key.chord(Key.CONTROL, Key.RETURN));
    const value = await messageInput.getAttribute('value');
    assert(value.includes('\n'));

    // Test Shift+Enter for new line
    await messageInput.sendKeys(Key.chord(Key.SHIFT, Key.RETURN));
    const updatedValue = await messageInput.getAttribute('value');
    assert(updatedValue.includes('\n'));
  });

  it('preserves theme settings', async function() {
    // Get initial theme
    const initialTheme = await driver.executeScript('return document.documentElement.getAttribute("data-theme")');
    
    // Toggle theme
    const themeButton = await driver.findElement(By.css('[aria-label="toggle theme"]'));
    await themeButton.click();
    
    // Refresh page
    await driver.navigate().refresh();
    
    // Verify theme persists
    const currentTheme = await driver.executeScript('return document.documentElement.getAttribute("data-theme")');
    assert.notStrictEqual(initialTheme, currentTheme);
  });

  it('handles very long conversations', async function() {
    const messageInput = await driver.findElement(By.css('textarea'));
    
    // Send 20 messages
    for (let i = 0; i < 20; i++) {
      await messageInput.sendKeys(`Test message ${i}`);
      await messageInput.sendKeys(Key.RETURN);
      await driver.sleep(500);
    }

    // Verify scroll position
    const messageList = await driver.findElement(By.css('.message-list'));
    const scrollTop = await driver.executeScript('return arguments[0].scrollTop', messageList);
    assert(scrollTop > 0);
  });

  it('handles code block copying', async function() {
    // Send a message with code block
    const messageInput = await driver.findElement(By.css('textarea'));
    await messageInput.sendKeys('```javascript\nconst test = "hello";\n```');
    await messageInput.sendKeys(Key.RETURN);

    // Wait for code block to appear
    await driver.wait(until.elementLocated(By.css('pre code')), 5000);
    
    // Click copy button
    const copyButton = await driver.findElement(By.css('.copy-button'));
    await copyButton.click();

    // Verify copy feedback
    const copyFeedback = await driver.findElement(By.css('.copy-feedback'));
    assert(await copyFeedback.isDisplayed());
  });

  it('handles window resizing gracefully', async function() {
    // Get initial layout measurements
    const initialLayout = await driver.executeScript(`
      const container = document.querySelector('.chat-container');
      return {
        width: container.offsetWidth,
        height: container.offsetHeight
      };
    `);

    // Resize window
    await driver.manage().window().setRect({ width: 800, height: 600 });
    await driver.sleep(500); // Wait for resize to complete

    // Verify responsive layout
    const newLayout = await driver.executeScript(`
      const container = document.querySelector('.chat-container');
      return {
        width: container.offsetWidth,
        height: container.offsetHeight
      };
    `);

    assert.notDeepStrictEqual(initialLayout, newLayout);
  });

  it('handles rapid model switching', async function() {
    // Wait for models to load
    await driver.wait(until.elementLocated(By.css('.MuiSelect-select')), 5000);
    
    const modelSelect = await driver.findElement(By.css('.MuiSelect-select'));
    const models = ['Hermes', 'Qwen', 'Gemma'];

    // Rapidly switch between models
    for (const model of models) {
      await modelSelect.click();
      await driver.wait(until.elementLocated(By.xpath(`//li[contains(text(), '${model}')]`)), 2000);
      const option = await driver.findElement(By.xpath(`//li[contains(text(), '${model}')]`));
      await option.click();
      await driver.sleep(100);
    }

    // Verify final model selection
    const selectedModel = await modelSelect.getText();
    assert(models.some(model => selectedModel.includes(model)));
  });

  it('handles concurrent chat windows', async function() {
    const chatWindows = await driver.findElements(By.css('.MuiPaper-root'));
    
    // Setup promises for concurrent message sending
    const sendPromises = chatWindows.map(async (window, index) => {
      const input = await window.findElement(By.css('textarea'));
      await input.sendKeys(`Message from window ${index}`);
      await input.sendKeys(Key.RETURN);
    });

    // Send messages concurrently
    await Promise.all(sendPromises);

    // Verify messages in both windows
    for (let i = 0; i < chatWindows.length; i++) {
      await driver.wait(
        until.elementLocated(By.xpath(`//div[contains(text(), 'Message from window ${i}')]`)),
        5000
      );
    }
  });

  it('handles network reconnection', async function() {
    // Simulate offline state
    await driver.executeScript(`
      window.originalNavigator = window.navigator;
      window.navigator.__defineGetter__('onLine', () => false);
      window.dispatchEvent(new Event('offline'));
    `);

    // Try to send a message
    const messageInput = await driver.findElement(By.css('textarea'));
    await messageInput.sendKeys('Test offline message');
    await messageInput.sendKeys(Key.RETURN);

    // Verify offline message
    await driver.wait(until.elementLocated(By.xpath("//div[contains(text(), 'Unable to connect')]")), 5000);

    // Simulate coming back online
    await driver.executeScript(`
      window.navigator.__defineGetter__('onLine', () => true);
      window.dispatchEvent(new Event('online'));
    `);

    // Verify reconnection
    await driver.wait(until.elementLocated(By.xpath("//div[contains(text(), 'Connection restored')]")), 5000);
  });
}); 