import os

file_path = r"c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update DELETE button onClick handler
old_delete_btn = """                  {/* DELETE */}
                  <button
                    onClick={() => {
                      if (selectedItemId) {
                        setModalAnnotations(modalAnnotations.filter((a) => a.id !== selectedItemId));
                        setSelectedItemId(null);
                      } else if (modalImageSrc) {
                        if (confirm('Hapus gambar background?')) {
                          setModalImageSrc(null);
                        }
                      }
                    }}
                    className="bg-[#EF6D6D] hover:bg-[#DC2626] text-white text-[11px] font-bold px-3 py-1.5 rounded-[4px] flex items-center space-x-1 shadow-sm transition-colors ml-auto cursor-pointer"
                  >"""

new_delete_btn = """                  {/* DELETE */}
                  <button
                    onClick={() => {
                      if (selectedItemId && selectedItemId !== 'image') {
                        setModalAnnotations((prev) => prev.filter((a) => a.id !== selectedItemId));
                        setSelectedItemId(null);
                      } else if (selectedItemId === 'image' || modalImageState.src || modalImageSrc) {
                        setModalImageSrc(null);
                        setModalImageState((prev) => ({
                          ...prev,
                          src: null,
                          cropLeft: 0,
                          cropTop: 0,
                          cropRight: 0,
                          cropBottom: 0
                        }));
                        setSelectedItemId(null);
                      }
                    }}
                    className="bg-[#EF6D6D] hover:bg-[#DC2626] text-white text-[11px] font-bold px-3 py-1.5 rounded-[4px] flex items-center space-x-1 shadow-sm transition-colors ml-auto cursor-pointer"
                  >"""

if old_delete_btn in code:
    code = code.replace(old_delete_btn, new_delete_btn, 1)
    print("Updated DELETE button handler!")
else:
    print("ERROR: old_delete_btn not found")

# 2. Add keyboard Delete / Backspace listener when activePoleModal is open
keyboard_hook = """  useEffect(() => {
    if (!activePoleModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedItemId && selectedItemId !== 'image') {
          setModalAnnotations((prev) => prev.filter((a) => a.id !== selectedItemId));
          setSelectedItemId(null);
        } else if (selectedItemId === 'image') {
          setModalImageSrc(null);
          setModalImageState((prev) => ({
            ...prev,
            src: null,
            cropLeft: 0,
            cropTop: 0,
            cropRight: 0,
            cropBottom: 0
          }));
          setSelectedItemId(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePoleModal, selectedItemId]);
"""

old_state_end = "  const [dragState, setDragState] = useState<{"
if old_state_end in code:
    # insert keyboard hook right above openPoleModal
    code = code.replace("  const openPoleModal = (", keyboard_hook + "\n  const openPoleModal = (", 1)
    print("Added keyboard Delete/Backspace hook!")
else:
    print("ERROR: openPoleModal not found for hook insertion")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Applied fix_delete_feature successfully!")
