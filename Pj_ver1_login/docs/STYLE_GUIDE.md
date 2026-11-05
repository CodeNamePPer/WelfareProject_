# Style Guide – ระบบสวัสดิการพนักงาน (ธีมขาว-น้ำเงิน)

เวอร์ชัน: 2.0 (4 พ.ย. 2569) – แทนที่ร่าง 1.0 (27 ต.ค. 2569)

ค่าทั้งหมดในเอกสารนี้เอามาจากหน้า Admin ที่ทำเสร็จแล้ว (`tailwind.config.ts`, `src/components/ui`, `src/components/layout`)
ค่าเหล่านี้เป็นมาตรฐานของทีม ส่วนวิธีใช้ใน code ดู [ADMIN_LAYOUT.md](./ADMIN_LAYOUT.md)

> **หน่วย px:** root ของเว็บตั้งไว้ 14px (`html { font-size: 0.875rem }`) ดังนั้น class ของ Tailwind ที่เป็น rem จะเล็กกว่าปกติ
> เช่น `h-10` = 35px, `h-8` = 28px, `rounded-lg` = 7px ค่า px ในเอกสารนี้คือขนาดที่แสดงจริงบนจอ

---

## 1. สี (Design tokens)

### สีหลัก (น้ำเงิน)

| Token | ค่า | ใช้กับ |
|---|---|---|
| `primary-700` | `#1E40AF` | hover / pressed, ตัวอักษรเมนูที่เลือก |
| `primary-600` | `#1D4ED8` | ปุ่มหลัก ลิงก์ ไอคอนเมนูที่เลือก |
| `primary-500` | `#3B82F6` | ขอบและ ring ตอน focus |
| `primary-100` | `#DBEAFE` | พื้นเมนูที่เลือกใน Sidebar, Tag แบบ info |
| `primary-50` | `#EFF6FF` | พื้น hover ของ Sidebar, แถว/การ์ดที่เลือกในตาราง |

### สีพื้นและข้อความ

| Token | ค่า | ใช้กับ |
|---|---|---|
| `paper` | `#F6F7F9` | พื้นหลังทั้งหน้า (ตั้งไว้ที่ `body`) |
| `white` | `#FFFFFF` | Sidebar, Panel, การ์ด, ช่องกรอก |
| `surface` | `#F8FAFC` | หัวตาราง, hover แถวตาราง, ปุ่มรองตอน hover |
| `line` | `#E2E8F0` | เส้นขอบทุกชนิด |
| `ink` | `#18253F` | ข้อความหลัก |
| `muted` | `#5B6B82` | ข้อความรอง / label / คำอธิบาย (contrast ≥ 4.5:1 บน paper, surface, primary-50) |
| `danger` | `#B3261E` | ลบ / ปฏิเสธ / ออกจากระบบ |
| `ok` | `#1F7A55` | ไอคอนและข้อความ "สำเร็จ" |

### สีสถานะคำขอ (ใช้ให้ตรงกันทั้งระบบ)

| สถานะ | Token | สีหลัก (จุด) | พื้น badge | ตัวอักษร badge |
|---|---|---|---|---|
| ฉบับร่าง (Draft) | `status-draft` | `#64748B` | – | – |
| รอตรวจสอบ | `status-pending` | `#D97706` | `#FEF3C7` | `#92400E` |
| อนุมัติ | `status-approved` | `#16A34A` | `#DCFCE7` | `#166534` |
| ปฏิเสธ | `status-rejected` | `#DC2626` | `#FEE2E2` | `#991B1B` |
| จ่ายแล้ว | (ยังไม่มี token) | `#1D4ED8` | `primary-100` | `primary-700` |

กฎ: สีสถานะต้องมีข้อความกำกับเสมอ ห้ามใช้สีอย่างเดียว

---

## 2. ตัวอักษร (Typography)

ฟอนต์หลัก: **IBM Plex Sans Thai** (น้ำหนัก 400 / 500 / 600 / 700) สำรอง: `system-ui, sans-serif`
ระยะบรรทัด 1.5 เท่าของขนาดตัวอักษร (ค่าเริ่มต้น)

| ระดับ | ขนาด | น้ำหนัก | Class | ใช้กับ |
|---|---|---|---|---|
| H1 | 22px | Semibold | `text-22 font-semibold` | หัวข้อหน้า (หน้าละหนึ่งอัน) |
| ตัวเลขสรุป | 24px | Semibold | `text-24 font-semibold tabular-nums` | ตัวเลขบนการ์ดสรุป |
| H2 | 17px | Semibold | `text-17 font-semibold` | หัวข้อ Panel / dialog |
| H2 (Dashboard) | 16px | Semibold | `text-16 font-semibold` | หัวข้อ Panel ในหน้าภาพรวม (`PanelTitle`) |
| H3 | 14px | Semibold | `text-14 font-semibold` | หัวข้อย่อยใน Panel |
| Body | 13px | Regular | `text-13` | เนื้อหา เมนู ตาราง ช่องกรอก คำอธิบายใต้หัวข้อหน้า |
| Caption | 12px | Regular / Medium | `text-12` | หัวตาราง, Tag, ข้อความเล็ก |
| Small | 11px | Regular / Semibold | `text-11` | ชื่อกลุ่มเมนู, role ใต้ชื่อผู้ใช้, ตัวเลข badge |

ใช้ token `text-10` … `text-24` เท่านั้น ห้ามใช้ `text-sm` / `text-xs` / `text-base` เพราะจะได้ขนาดที่หลุด scale (12.25 / 10.5 / 14px)

### การแสดงผลข้อมูล

- ตัวเลขเงินชิดขวา ใช้ `tabular-nums` เช่น `฿12,500.00` (ในตารางไม่แสดงสตางค์ เช่น `฿6,000`)
- วันที่แบบเต็ม `27 ต.ค. 2569` แบบย่อในตาราง `27 ต.ค. 69` (ฟังก์ชันใน `src/lib/format.ts`)

---

## 3. เลย์เอาต์ (Layout)

### โครงหลัก (App Shell)

- Sidebar ซ้าย กว้าง 260px (ย่อได้เหลือ 72px)
- จอเล็กกว่า 768px: มี header บนสุดสูง 49px (`h-14`) พร้อมปุ่ม ☰ เปิด Sidebar แบบ drawer
- พื้นที่เนื้อหา max-width 1440px, padding ซ้ายขวา 14 / 21 / 28px (`px-4 sm:px-6 lg:px-8`), บนล่าง 21 / 28px (`py-6 lg:py-8`)
- เว้นท้ายหน้า 72px ให้ปุ่มทางลัด (FAB)

### ระยะและรูปทรง

- ระยะระหว่างส่วนในหน้า 24px · ใน Panel 16px · การ์ดย่อย 12px
- Radius: Panel 10px · การ์ดย่อย / การ์ดในรายการมือถือ 8px · ปุ่มเล็ก / หัวตาราง 6px · ปุ่มและช่องกรอก 7px (`rounded-lg`) · Tag 4px · badge / chip ทรงแคปซูล
- เงา: การ์ด `0 1px 2px rgba(15,23,42,.06)` · popover / เมนูลอย `0 8px 24px -6px rgba(15,23,42,.18)` ไม่ใช้เงาหนักกว่านี้

### Responsive

| ความกว้าง | Sidebar | ตาราง |
|---|---|---|
| ≥ 1024px | เต็ม 260px (กด ☰ ย่อได้) | ตารางปกติ |
| 768–1023px | ย่อ 72px เป็นค่าเริ่มต้น | ตารางปกติ เลื่อนแนวนอนใน container ได้ |
| < 768px | drawer | เปลี่ยนเป็นรายการการ์ด |

ห้ามให้ทั้งหน้าเลื่อนแนวนอน

---

## 4. คอมโพเนนต์หลัก

### ปุ่ม (`Button`)

| ขนาด | ความสูง | ตัวอักษร |
|---|---|---|
| `md` (ค่าเริ่มต้น) | 35px | 13px Medium |
| `sm` | 28px | 13px Medium |

- Primary: พื้น `primary-600` ตัวอักษรขาว, hover `primary-700`
- Secondary (ค่าเริ่มต้น): ขอบ `line` พื้นขาว ตัวอักษร `ink`, hover พื้น `surface`
- Ghost: ไม่มีขอบ ตัวอักษร `muted`, hover พื้น `surface`
- Tonal: พื้น `primary-50` ตัวอักษร `primary-700`
- Danger: พื้น `danger` ตัวอักษรขาว ใช้กับ ปฏิเสธ / ลบ

### ช่องกรอกข้อมูล (`SearchInput`, `Select`, input ในฟอร์ม)

- สูง 35px (`h-10`), ตัวอักษร 13px, radius 7px
- ปกติ: ขอบ `line` · hover: ขอบ `muted` จาง · focus: ขอบ `primary-500` + ring 1px `primary-500`
- error: ขอบแดง + ข้อความอธิบายใต้ช่อง

### Status Badge / Tag

- `StatusBadge`: ทรงแคปซูล พื้นสีอ่อน ตัวอักษรสีเข้ม มีจุดสีนำหน้า (สีตามข้อ 1)
- `Tag`: สูง 22px radius 4px ตัวอักษร 12px Medium มี tone: success / warning / danger / info / neutral / outline

### ตาราง (`src/components/ui/table.ts`)

- หัวตาราง: พื้น `surface` ขอบ `line` radius 6px ตัวอักษร 12px Medium สี `muted`
- เซลล์: ตัวอักษร 13px สี `ink` padding 14px บน-ล่าง / 10px ซ้าย-ขวา เส้นคั่นแถว 1px `line`
- hover แถว: พื้น `surface` · แถวที่เลือก: พื้น `primary-50`
- มี pagination, ค้นหา, กรอง และปุ่ม Export มุมขวาบน

### Sidebar

- เมนู 13px Semibold, ไอคอน 14px (`size-4`)
- เมนูที่เลือก: พื้น `primary-100` ตัวอักษร `primary-700` ไอคอน `primary-600` · hover: พื้น `primary-50`
- ตัวเลขแจ้งเตือน: พื้น `primary-600` ตัวอักษรขาว 11px


### Modal / Toast

- ยืนยันก่อน อนุมัติ / ปฏิเสธ / ย้อนขั้นตอน / ลบ (`ConfirmDialog`)
- การปฏิเสธต้องกรอกเหตุผล

---

## 5. ข้อตกลงร่วมสำหรับทีม

1. ทุกหน้ารายการต้องมี ค้นหา / กรอง / Export / สถานะว่าง (Empty state)
2. ทุกหน้าต้องมีสถานะ Loading (skeleton) เป้าหมายโหลดภายใน 5 วินาที
3. ข้อความเป็นภาษาไทยเป็นหลัก ปุ่มใช้คำกริยาสั้น เช่น "ส่งคำขอ" "อนุมัติ" "ปฏิเสธ" "ย้อนกลับ"
4. สิทธิ์ที่ไม่มี ให้ซ่อนเมนู ไม่ใช่แสดงแล้ว disable
5. ใช้ token สีและขนาดตัวอักษรจากเอกสารนี้ ห้ามใส่ค่า hex หรือ class สีของ Tailwind เอง (เช่น `slate-300`)

---

## 6. จุดที่ code ยังไม่ตรงกับเอกสารนี้

| ไฟล์ | ปัจจุบัน | ควรเป็น |
|---|---|---|
| `components/ui/Button.tsx` ขนาด `md` | `text-sm` (12.25px) | `text-13` |
| `components/ui/Button.tsx` Secondary hover | `hover:border-slate-300` | token ของระบบ เช่น `hover:border-muted/60` |
| `components/ui/StatusBadge.tsx` | `text-xs` (10.5px) | `text-12` |
| `components/ui/Card.tsx` หัวข้อ | `text-base` (14px) | `text-17` |

---

## 7. สิ่งที่เปลี่ยนจากร่าง 1.0

| หัวข้อ | ร่าง 1.0 | 2.0 |
|---|---|---|
| ขนาดตัวอักษร | H1 28 / H2 22 / H3 18 / Body 16 / Caption 14 | H1 22 / H2 17 / H3 14 / Body 13 / Caption 12 |
| พื้นหลังหน้า | `#FFFFFF` | `#F6F7F9` (Panel ขาว) |
| ข้อความหลัก | `#0F172A` | `#18253F` |
| ข้อความรอง | `#64748B` | `#5B6B82` |
| สีลบ / ปฏิเสธ (ปุ่ม) | `#DC2626` | `#B3261E` |
| ฟอนต์สำรอง | Noto Sans Thai | system-ui |
| Sidebar | 240px | 260px |
| Topbar | 64px ทุกจอ | ไม่มีบน desktop, มือถือ 49px |
| max-width เนื้อหา | 1280px | 1440px |
| ปุ่ม / ช่องกรอก | 40 / 44px | 35 / 35px |
| Radius ปุ่ม / การ์ด | 8 / 12px | 7 / 10px |
| ปุ่ม Secondary | ขอบน้ำเงิน | ขอบเทา (`line`) |
| hover / เลือกแถวตาราง | `primary-50` / `primary-100` | `surface` / `primary-50` |
| ตารางบนมือถือ | เลื่อนแนวนอน | เปลี่ยนเป็นรายการการ์ด |
