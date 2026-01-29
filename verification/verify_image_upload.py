from playwright.sync_api import sync_playwright

def verify_image_upload():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the harness page
        page.goto("http://localhost:5173/harness/image-upload")

        # Wait for the page to load
        page.wait_for_selector("h1")

        # Verify the title
        print(f"Page title: {page.title()}")

        # Check if the upload area is visible
        upload_area = page.get_by_text("Click to upload").first
        if upload_area.is_visible():
            print("Upload area is visible.")

        # Check if the dashed border style is applied (via inline style)
        # We check the parent div of the text
        upload_container = page.locator("div.border-dashed").first # Wait, I removed the class, I used style
        # Let's find the container by looking up from the text
        upload_container = page.locator("div[role='button']").first

        style = upload_container.get_attribute("style")
        print(f"Container style: {style}")

        # Take a screenshot
        page.screenshot(path="verification/image_upload.png")
        print("Screenshot saved to verification/image_upload.png")

        browser.close()

if __name__ == "__main__":
    verify_image_upload()
