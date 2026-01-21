# Attendance Status Feature - UI/UX Flow Guide

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    TEACHER SCHEDULE PAGE                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Schedule Card (Clickable)                                  │ │
│  │ ┌──────────────────────────────────────────────────────┐  │ │
│  │ │ Math - Grade 10-A (Morning Shift)                    │  │ │
│  │ │ Monday 8:00-9:00 | 28 Students                       │  │ │
│  │ └──────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│         ↓ (Click) → Navigates to Details Page
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   SCHEDULE DETAILS PAGE                         │
│                                                                 │
│  Math - Grade 10-A (Morning Shift)                              │
│  Monday 8:00-9:00 | 28 Students                                │
│  [Search field] 🔍                                              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📋 Student: Ali Khan                                    │ ✓ │
│  │    ID: STU-2024-0001                                    │ │
│  │    Gender: Male                                         │ │
│  │    Section: A                                           │   │
│  │    Scanned: 8:15 AM                                     │   │
│  │                                              [Status▼]   │   │
│  │                                              Color Btn    │   │
│  └─────────────────────────────────────────────────────────┘   │
│         ↑                                      ↑ (Click)        │
│    Student Card                           Status Button        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📋 Student: Fatima Ahmed                               │ ✓ │
│  │    ID: STU-2024-0002                                    │ │
│  │    Gender: Female                                       │ │
│  │    Section: A                                           │   │
│  │    Scanned: 7:50 AM                                     │   │
│  │                                              [Status▼]   │   │
│  │                                              Color Btn    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📋 Student: Omar Hassan                                │ ✗ │
│  │    ID: STU-2024-0003                                    │ │
│  │    Gender: Male                                         │ │
│  │    Section: A                                           │   │
│  │    Not Scanned                                          │   │
│  │                                              [Status▼]   │   │
│  │                                              Color Btn    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓ (Click Status Button)
┌─────────────────────────────────────────────────────────────────┐
│                   STATUS SELECTION DIALOG                       │
│                                                                 │
│    Update Attendance Status                              [✕]   │
│                                                                 │
│              Ali Khan                                          │
│                                                                 │
│   ┌──────────────────┐  ┌──────────────────┐                 │
│   │   ✓ Present      │  │   ✗ Absent       │                 │
│   │   (Green)        │  │   (Red)          │                 │
│   │                  │  │                  │                 │
│   │  Green Box       │  │  White Box       │                 │
│   └──────────────────┘  └──────────────────┘                 │
│                                                                 │
│   ┌──────────────────┐  ┌──────────────────┐                 │
│   │   ⏱ Late        │  │   ✖ Cutting      │                 │
│   │   (Orange)       │  │   (Deep Orange)  │                 │
│   │                  │  │                  │                 │
│   │  White Box       │  │  White Box       │                 │
│   └──────────────────┘  └──────────────────┘                 │
│                                                                 │
│   ┌──────────────────┐  ┌──────────────────┐                 │
│   │  🏥 Sick Leave  │  │  ☐ Excused       │                 │
│   │  (Blue)         │  │  (Purple)        │                 │
│   │                  │  │                  │                 │
│   │  White Box       │  │  White Box       │                 │
│   └──────────────────┘  └──────────────────┘                 │
│                                                                 │
│                      [Cancel]                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓ (Select Status)
┌─────────────────────────────────────────────────────────────────┐
│         Toast: "Updating status..." (1 second)                │
│                                                                 │
│  [Loading indicator spinning...]                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓ (API Response)
        ┌─────────────────────────────────────────┐
        │   On Success (HTTP 200)                 │
        │                                         │
        │  Shows green toast:                    │
        │  "Status updated to Present" ✓          │
        └─────────────────────────────────────────┘
                     OR
        ┌─────────────────────────────────────────┐
        │   On Error (HTTP 4xx/5xx)               │
        │                                         │
        │  Shows red toast:                       │
        │  "Error: Student not found" ✗           │
        └─────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│         SCHEDULE DETAILS PAGE - UPDATED                         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📋 Student: Ali Khan                                    │ ✓ │
│  │    ID: STU-2024-0001                                    │ │
│  │    Gender: Male                                         │ │
│  │    Section: A                                           │   │
│  │    Scanned: 8:15 AM                                     │   │
│  │                                            [Present✎]   │   │
│  │                                       (Green Button)     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Status changed from "Not Scanned" to "Present" ✓              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Status Button States

### State 1: Normal (Not Selected)
```
┌────────────────────┐
│   ✓ Present    ✎ │  ← Gray border, white background
│                    │
│  (Not highlighted) │
└────────────────────┘
```

### State 2: Hovered (Desktop Only)
```
┌────────────────────┐
│   ✓ Present    ✎ │  ← Cursor changes to pointer
│                    │
│  (Opacity slightly │
│   increased)       │
└────────────────────┘
```

### State 3: Active Dialog
```
┌─────────────────────────────────────────────┐
│  ✓ Present                                  │  ← Checkmark visible
│  (Green background                          │  ← Green border
│   with opacity 20%)                         │
│                                             │
│  Green check circle icon                    │
└─────────────────────────────────────────────┘
```

### State 4: Inactive Dialog Option
```
┌─────────────────────────────────────────────┐
│  ○ Absent                                   │  ← Empty circle
│  (Gray/100 background)                      │  ← Transparent border
│                                             │
│  Red circle outline icon                    │
└─────────────────────────────────────────────┘
```

---

## Color System

### Status Colors
```
Present      → #10B981 (Emerald Green)     ✓
Absent       → #EF4444 (Red)               ✗
Late         → #F97316 (Orange)            ⏱
Cutting      → #EA580C (Deep Orange)       ✖
Sick Leave   → #3B82F6 (Blue)              🏥
Excused      → #8B5CF6 (Purple)            ☐
```

### Dialog Appearance
- **Selected**: Color with 20% opacity background + colored border
- **Unselected**: Light gray background + transparent border
- **Text**: Bold when selected, regular when unselected

---

## User Interaction States

### Loading States
```
Button Clicked
    ↓
Dialog appears (instant)
    ↓
User selects option
    ↓
Dialog closes (instant)
    ↓
Toast shows "Updating..." (1 sec)
    ↓
Button disabled (can't click during update)
    ↓
API response received
    ↓
Button re-enabled
    ↓
Success/Error toast shown (2 sec)
```

### Error Recovery
```
Status: Before = "Late", Selected = "Absent"
    ↓
API Error Response
    ↓
Toast: "Error: Student not found"
    ↓
Status: Reverts to "Late" (previous value)
    ↓
User can try again
```

---

## Mobile Responsive Layout

### Landscape View (Small Screen)
```
┌──────────────────────────────────┐
│ Math Class                  [≡]  │
├──────────────────────────────────┤
│ [Search field]               [🔍]│
├──────────────────────────────────┤
│ │ Ali Khan                  [✓] │ 
│ │ ID: STU-001              [Ed]│ 
│ └──────────────────────────────┘│
│ │ Fatima Ahmed             [✓] │ 
│ │ ID: STU-002              [Ed]│ 
│ └──────────────────────────────┘│
└──────────────────────────────────┘
```

### Landscape View (Large Screen)
```
┌────────────────────────────────────────────────┐
│ Math Class - Grade 10-A (Monday 8:00)    [≡]  │
├────────────────────────────────────────────────┤
│ [Search field] [Filters]                  [🔍] │
├────────────────────────────────────────────────┤
│ Student Cards in scrollable list             │
│ Each card shows: Name, ID, Gender, Status    │
└────────────────────────────────────────────────┘
```

---

## Dialog Layout

### 2-Column Grid (Mobile)
```
┌────────────────────────────┐
│ Update Status              │
│ Ali Khan                   │
├────────────────────────────┤
│ [Present]  [Absent]        │
│ [Late]     [Cutting]       │
│ [Sick]     [Excused]       │
├────────────────────────────┤
│         [Cancel]           │
└────────────────────────────┘
```

### Scrollable Content
- If screen very small, options stack vertically
- Always maintains 2-column grid when possible
- Dialog scrollable if content exceeds screen height

---

## Animations & Transitions

### Button Click Animation
```
Tap → Slight opacity decrease (ripple effect)
      ↓
Show dialog (fade in 200ms)
      ↓
Option taps → selected state highlight
      ↓
Dialog closes (fade out 150ms)
```

### Status Update Animation
```
Status changes → Color transition (150ms)
                 ↓
                Icon rotation (100ms)
                 ↓
                Text scale (100ms)
```

### Toast Animations
```
Appears → Slide up + fade in (300ms)
Wait → Display for 1-2 seconds
          ↓
Disappears → Slide down + fade out (300ms)
```

---

## Accessibility Features

### Keyboard Navigation
- Tab through options in dialog
- Space/Enter to select
- Escape to close dialog

### Screen Reader Support
- Status button announces: "Status: Present, edit button"
- Dialog announces: "Update attendance status for Ali Khan"
- Each option announces: "Present, currently selected" or "Absent"

### Color Contrast
- All colors meet WCAG AA standards
- Text always has sufficient contrast with background
- Icons used alongside colors (not just color)

---

## Error States Display

### Network Error
```
┌──────────────────────────────────┐
│ ✗ Error                          │
│ Network error. Please check your │
│ connection and try again.        │
└──────────────────────────────────┘
```

### Server Error
```
┌──────────────────────────────────┐
│ ✗ Error                          │
│ Server error. Student not found  │
│ in this schedule.                │
└──────────────────────────────────┘
```

### Authorization Error
```
┌──────────────────────────────────┐
│ ✗ Error                          │
│ Unauthorized. Please login again.│
└──────────────────────────────────┘
```

---

## Success States Display

### Update Success
```
┌──────────────────────────────────┐
│ ✓ Success                        │
│ Status updated to Present        │
└──────────────────────────────────┘
```
*Green background, appears for 2 seconds, auto-dismisses*

### Multiple Updates
```
Status 1: "Status updated to Absent" ✓ (2s)
Status 2: "Status updated to Late" ✓ (2s)
Status 3: "Status updated to Present" ✓ (2s)
```
*Each toast shows one at a time, queued properly*

---

## Status Legend

When hovering over status buttons in dialog:

```
Present ✓
→ Student arrived on time and scanned QR
  Click to mark as Present for this subject

Absent ✗  
→ Student did not come to school
  Click to mark as Absent for this subject

Late ⏱
→ Student arrived after class started
  Click to mark as Late for this subject

Cutting ✖
→ Student skipped this class
  Click to mark as Cutting for this subject

Sick Leave 🏥
→ Student is sick (excused absence)
  Click to mark as Sick Leave for this subject

Excused ☐
→ Student has valid reason for absence
  Click to mark as Excused for this subject
```

This information could appear in a tooltip on hover (desktop) or in help section (mobile).
