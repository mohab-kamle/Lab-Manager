from playwright.sync_api import Page, expect, sync_playwright
import time

def test_image_upload(page: Page):
    # 1. Arrange: Go to the harness page.
    print("Navigating to harness page...")
    page.goto("http://localhost:5173/harness-image-upload")

    # Wait for the images to load
    print("Waiting for images...")
    page.wait_for_selector(".image-preview-item")

    # 2. Act: Hover over the first image to see the remove button
    print("Hovering over first image...")
    first_image = page.locator(".image-preview-item").first
    first_image.hover()

    # 3. Assert: Verify remove button is visible
    # Note: opacity transition might take 0.2s. Playwright waits?
    # expect checking CSS property might retry.
    remove_btn = first_image.locator(".image-preview-remove-btn")
    expect(remove_btn).to_have_css("opacity", "1")
    print("Remove button visible on hover.")

    # 4. Act: Focus the first image (using keyboard)
    # Focus manually to be sure
    print("Focusing first image...")
    first_image.focus()

    # Check if first image has tabIndex=0
    expect(first_image).to_have_attribute("tabindex", "0")

    # Check if remove button is visible on focus
    # We might need to wait for transition
    expect(remove_btn).to_have_css("opacity", "1")
    print("Remove button visible on focus.")

    # Screenshot
    print("Taking screenshot...")
    page.screenshot(path="verification/verification_image_upload.png")

    # 5. Act: Test Delete key
    print("Testing Delete key...")
    # Focus first image
    first_image.focus()
    # Press Delete
    page.keyboard.press("Delete")

    # 6. Assert: Image count reduced from 2 to 1
    # Initial count was 2 (from harness code)
    print("Verifying image count...")
    expect(page.locator(".image-preview-item")).to_have_count(1)

    # Final Screenshot
    page.screenshot(path="verification/verification_image_upload_after_delete.png")
    print("Verification passed.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_image_upload(page)
        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="verification/verification_failure.png")
            raise e
        finally:
            browser.close()
