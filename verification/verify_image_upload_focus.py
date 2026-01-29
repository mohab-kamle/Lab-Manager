from playwright.sync_api import sync_playwright

def verify_image_upload():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the harness page
        page.goto("http://localhost:5173/harness/image-upload")

        # Wait for the page to load
        page.wait_for_selector("h1")

        # Focus the upload area
        upload_area_container = page.locator("div[role='button']").first
        upload_area_container.focus()

        # Take a screenshot
        page.screenshot(path="verification/image_upload_focused.png")
        print("Screenshot saved to verification/image_upload_focused.png")

        browser.close()

if __name__ == "__main__":
    verify_image_upload()
