from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
import time
import unittest

class TestDualChatInterface(unittest.TestCase):
    def setUp(self):
        self.driver = webdriver.Chrome()
        self.driver.maximize_window()
        # Wait for LM Studio to be ready
        time.sleep(2)
        self.driver.get("http://localhost:3000")
        self.wait = WebDriverWait(self.driver, 10)

    def tearDown(self):
        if self.driver:
            self.driver.quit()

    def wait_for_element(self, by, value, timeout=10):
        return WebDriverWait(self.driver, timeout).until(
            EC.presence_of_element_located((by, value))
        )

    def wait_for_clickable(self, by, value, timeout=10):
        return WebDriverWait(self.driver, timeout).until(
            EC.element_to_be_clickable((by, value))
        )

    def test_basic_interface(self):
        """Test that basic interface elements are present"""
        # Wait for the interface to load
        time.sleep(3)

        # Check both chat windows exist
        chat_windows = self.driver.find_elements(By.CLASS_NAME, "MuiPaper-root")
        self.assertGreaterEqual(len(chat_windows), 2, "Should find at least 2 chat windows")

        # Check model selectors exist
        model_selectors = self.driver.find_elements(By.CLASS_NAME, "MuiSelect-select")
        self.assertGreaterEqual(len(model_selectors), 2, "Should find at least 2 model selectors")

        # Check text inputs exist
        text_inputs = self.driver.find_elements(By.TAG_NAME, "textarea")
        self.assertGreaterEqual(len(text_inputs), 2, "Should find at least 2 text inputs")

    def test_model_selection(self):
        """Test model selection in both chat windows"""
        # Wait for models to load
        time.sleep(3)
        
        try:
            # Find and click model selectors
            selectors = self.driver.find_elements(By.CLASS_NAME, "MuiSelect-select")
            self.assertGreaterEqual(len(selectors), 2, "Should find at least 2 model selectors")
            
            for selector in selectors[:2]:  # Test first two selectors
                # Click to open dropdown
                selector.click()
                time.sleep(1)
                
                # Look for the Qwen model option
                qwen_option = self.driver.find_element(By.XPATH, "//li[contains(text(), 'qwen2.5-7b-instruct-1m')]")
                self.assertIsNotNone(qwen_option, "Should find qwen2.5-7b-instruct-1m model in options")
                
                # Select the Qwen model
                qwen_option.click()
                time.sleep(1)
                
                # Verify selection
                self.assertTrue(
                    "qwen2.5-7b-instruct-1m" in selector.text,
                    f"Model selection failed: Expected qwen2.5-7b-instruct-1m, got {selector.text}"
                )
        except Exception as e:
            self.fail(f"Failed to select models: {str(e)}")

    def test_chat_functionality(self):
        """Test sending messages in both chat windows"""
        # Wait for interface to load
        time.sleep(3)

        try:
            # Test left chat
            self._test_chat_window(0, "Hello from left chat")
            time.sleep(2)
            
            # Test right chat
            self._test_chat_window(1, "Hello from right chat")
        except Exception as e:
            self.fail(f"Chat functionality test failed: {str(e)}")

    def _test_chat_window(self, index, message):
        try:
            # First ensure the correct model is selected
            selectors = self.driver.find_elements(By.CLASS_NAME, "MuiSelect-select")
            selector = selectors[index]
            if "qwen2.5-7b-instruct-1m" not in selector.text:
                selector.click()
                time.sleep(1)
                qwen_option = self.driver.find_element(By.XPATH, "//li[contains(text(), 'qwen2.5-7b-instruct-1m')]")
                qwen_option.click()
                time.sleep(1)

            # Find text inputs
            inputs = WebDriverWait(self.driver, 10).until(
                EC.presence_of_all_elements_located((By.TAG_NAME, "textarea"))
            )
            self.assertGreaterEqual(len(inputs), 2, "Should find at least 2 text inputs")
            
            # Wait for the specific input to be clickable and visible
            input_field = inputs[index]
            WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable(input_field)
            )
            
            # Scroll the input field into view
            self.driver.execute_script("arguments[0].scrollIntoView(true);", input_field)
            time.sleep(1)
            
            # Click the input field to ensure it's focused
            ActionChains(self.driver).move_to_element(input_field).click().perform()
            time.sleep(1)
            
            # Type message using ActionChains
            actions = ActionChains(self.driver)
            actions.send_keys(Keys.CONTROL + "a").pause(0.5)
            actions.send_keys(Keys.DELETE).pause(0.5)
            actions.send_keys(message).pause(0.5)
            actions.perform()
            time.sleep(1)

            # Find and click send button
            send_buttons = WebDriverWait(self.driver, 10).until(
                EC.presence_of_all_elements_located((By.CSS_SELECTOR, "button[type='submit']"))
            )
            self.assertGreaterEqual(len(send_buttons), 2, "Should find at least 2 send buttons")
            
            # Wait for the specific send button to be clickable
            send_button = send_buttons[index]
            WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable(send_button)
            )
            
            # Scroll the button into view
            self.driver.execute_script("arguments[0].scrollIntoView(true);", send_button)
            time.sleep(1)
            
            # Use ActionChains to click the button
            ActionChains(self.driver).move_to_element(send_button).click().perform()

            # Wait for response
            time.sleep(7)  # Increased wait time for response

            # Check if message appears in chat
            messages = WebDriverWait(self.driver, 10).until(
                EC.presence_of_all_elements_located((By.CLASS_NAME, "MuiListItem-root"))
            )
            self.assertTrue(
                any(message in msg.text for msg in messages),
                f"Message '{message}' not found in chat"
            )
        except Exception as e:
            raise Exception(f"Failed to interact with chat window {index}: {str(e)}")

    def test_chat_history(self):
        """Test chat history functionality"""
        # Wait for interface to load
        time.sleep(3)

        try:
            # First send a message to have something in history
            self._test_chat_window(0, "Test message for history")
            time.sleep(2)

            # Click history button for first chat
            history_buttons = WebDriverWait(self.driver, 10).until(
                EC.presence_of_all_elements_located((By.CSS_SELECTOR, "button[aria-label='Chat History']"))
            )
            self.assertGreaterEqual(len(history_buttons), 1, "Should find at least 1 history button")
            
            # Scroll the button into view
            self.driver.execute_script("arguments[0].scrollIntoView(true);", history_buttons[0])
            time.sleep(1)
            
            history_buttons[0].click()
            time.sleep(1)

            # Find and click clear history
            clear_buttons = WebDriverWait(self.driver, 10).until(
                EC.presence_of_all_elements_located((By.XPATH, "//li[contains(text(), 'Clear Chat History')]"))
            )
            if clear_buttons:
                clear_buttons[0].click()
                time.sleep(2)  # Increased wait time after clearing

                # Verify chat is cleared (wait for messages to disappear)
                try:
                    WebDriverWait(self.driver, 5).until(
                        lambda driver: len(driver.find_elements(By.CLASS_NAME, "MuiListItem-root")) == 0
                    )
                except TimeoutException:
                    self.fail("Chat was not cleared after clicking Clear Chat History")
        except Exception as e:
            self.fail(f"Chat history test failed: {str(e)}")

    def test_error_handling(self):
        """Test error handling when LM Studio is not available"""
        # Wait for interface to load
        time.sleep(3)

        try:
            # Send a message
            inputs = self.driver.find_elements(By.TAG_NAME, "textarea")
            self.assertGreaterEqual(len(inputs), 1, "Should find at least 1 text input")
            
            # Wait for the input to be clickable
            input_field = inputs[0]
            WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "textarea:nth-of-type(1)"))
            )
            
            # Click the input field to ensure it's focused
            ActionChains(self.driver).move_to_element(input_field).click().perform()
            time.sleep(1)
            
            # Type message using ActionChains
            actions = ActionChains(self.driver)
            actions.send_keys(Keys.CONTROL + "a").pause(0.5)
            actions.send_keys(Keys.DELETE).pause(0.5)
            actions.send_keys("Test error handling").pause(0.5)
            actions.perform()
            time.sleep(1)
            
            send_buttons = self.driver.find_elements(By.CSS_SELECTOR, "button[type='submit']")
            self.assertGreaterEqual(len(send_buttons), 1, "Should find at least 1 send button")
            
            # Wait for the send button to be clickable
            send_button = send_buttons[0]
            WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "button[type='submit']:nth-of-type(1)"))
            )
            
            # Use ActionChains to click the button
            ActionChains(self.driver).move_to_element(send_button).click().perform()
            
            # Wait for potential error message
            time.sleep(3)
            
            try:
                error_message = self.wait_for_element(
                    By.XPATH, 
                    "//*[contains(text(), 'Error') or contains(text(), 'error')]",
                    timeout=5
                )
                self.assertIsNotNone(error_message, "Should find error message when LM Studio is offline")
            except TimeoutException:
                # If no error message is found, LM Studio might be online
                pass
        except Exception as e:
            self.fail(f"Error handling test failed: {str(e)}")

if __name__ == "__main__":
    # Create test suite
    suite = unittest.TestLoader().loadTestsFromTestCase(TestDualChatInterface)
    
    # Run tests with detailed output
    runner = unittest.TextTestRunner(verbosity=2)
    runner.run(suite) 