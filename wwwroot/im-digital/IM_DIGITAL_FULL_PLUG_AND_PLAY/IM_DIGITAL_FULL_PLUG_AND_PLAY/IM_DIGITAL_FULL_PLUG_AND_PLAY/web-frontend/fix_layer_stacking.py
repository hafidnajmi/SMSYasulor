import os

file_path = r"c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Image container z-10
old_img_container = """                    {/* Interactive Image with Drag, Scale, and Crop */}
                    {modalImageState.src && (
                      <div
                        className="absolute"
                        style={{
                          left: `${modalImageState.left}px`,
                          top: `${modalImageState.top}px`,
                          width: `${modalImageState.width}px`,
                          height: `${modalImageState.height}px`
                        }}"""

new_img_container = """                    {/* Interactive Image with Drag, Scale, and Crop */}
                    {modalImageState.src && (
                      <div
                        className="absolute z-10"
                        style={{
                          left: `${modalImageState.left}px`,
                          top: `${modalImageState.top}px`,
                          width: `${modalImageState.width}px`,
                          height: `${modalImageState.height}px`
                        }}"""

if old_img_container in code:
    code = code.replace(old_img_container, new_img_container, 1)
    print("Updated image container to z-10!")
else:
    print("ERROR: old_img_container not found")

# 2. SVG Annotations Layer z-20 (Always on top of image)
old_svg_layer = """                    {/* Annotations Layer */}
                    <svg
                      className="absolute inset-0 w-full h-full"
                      style={{ pointerEvents: 'none' }}
                    >"""

new_svg_layer = """                    {/* Annotations Layer (Always on top of image) */}
                    <svg
                      className="absolute inset-0 w-full h-full z-20"
                      style={{ pointerEvents: 'none' }}
                    >"""

if old_svg_layer in code:
    code = code.replace(old_svg_layer, new_svg_layer, 1)
    print("Updated SVG annotations layer to z-20!")
else:
    print("ERROR: old_svg_layer not found")

# 3. HTML text / dimension / note annotations layer z-30
old_html_annot = """                    {/* HTML Overlay for Text, Dimension Labels, and Notes */}
                    {modalAnnotations.map((item) => {"""

new_html_annot = """                    {/* HTML Overlay for Text, Dimension Labels, and Notes (Always on top) */}
                    <div className="absolute inset-0 pointer-events-none z-30">
                    {modalAnnotations.map((item) => {"""

if old_html_annot in code:
    code = code.replace(old_html_annot, new_html_annot, 1)
    # Close the wrapper div after the map
    # Find the end of modalAnnotations.map before modal buttons
    map_end_pattern = """                        return null;
                      })}

                  </div>"""
    if map_end_pattern in code:
        code = code.replace(map_end_pattern, """                        return null;
                      })}
                    </div>

                  </div>""", 1)
        print("Closed HTML annotations wrapper div!")
    else:
        print("Looking for alternate map end pattern...")
        # let's find where modalAnnotations ends
        code = code.replace("return null;\n                      })}\n\n", "return null;\n                      })}\n                    </div>\n\n", 1)
    print("Updated HTML annotations overlay to z-30!")
else:
    print("ERROR: old_html_annot not found")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Applied fix_layer_stacking successfully!")
