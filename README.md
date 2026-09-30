# DairyPulse

> **A simple digital farm notebook for milk sales, expenses, and real profit tracking.**

DairyPulse is designed for dairy farmers and herdsmen who need an instant, uncomplicated understanding of their farm's daily finances. It replaces paper notebooks and complex accounting software with a calm, mobile-friendly interface powered directly by **Google Sheets** and **Google Apps Script**.

---

## 1. What DairyPulse Does

DairyPulse answers four essential questions every day:

1. **How much milk did I sell?** (e.g., `128 L`)
2. **How much money came in?** (e.g., `UGX 400,000`)
3. **How much did I spend?** (e.g., `UGX 95,000`)
4. **How much profit did I make?** (e.g., `UGX 305,000`)

### Non-Accounting, Farmer-Friendly Terminology
* **Milk Sold** (instead of Gross Production or Volume)
* **Money In** (instead of Revenue or Accounts Receivable Receipts)
* **Money Spent** (instead of Operating Expenditure or Opex)
* **Money Owed** (instead of Debtors or Accounts Receivable)
* **Profit** (calculated simply as **Money In - Money Spent**)

*Note: DairyPulse is strictly focused on farm finances. It intentionally does not contain complicated herd-management features, cow profiles, or veterinary cycles.*

---

## 2. Technology Stack

* **Frontend:** React 19, TypeScript, Vite, Bootstrap 5, Bootstrap Icons, Recharts
* **Backend API:** Google Apps Script Web App (`apps-script/Code.gs`)
* **Database:** Google Sheets (`DairyPulse Database`)
* **Styling:** Custom calm farm palette (Forest Green, Warm Cream, Charcoal, Muted Earth)

---

## 3. Architecture

```text
DairyPulse React Frontend
        ↓
Centralized API Service (src/services/api.ts)
        ↓
Google Apps Script Web App (apps-script/Code.gs)
        ↓
Google Sheets Database (DairyPulse Database)
```

* All read and write operations pass safely through `src/services/api.ts`.
* Automatic offline and demo mode fallback is included out-of-the-box, ensuring the app remains responsive and fully usable even before the Google Sheet is linked.

---

## 4. Google Sheets & Apps Script Setup (Step-by-Step)

Follow these 8 steps to connect your own Google Sheet:

### Step 1: Create the Google Spreadsheet
Go to [Google Sheets](https://sheets.new) and create a spreadsheet titled:
```text
DairyPulse Database
```

### Step 2: Create the Required Sheets
Create the following 5 sheets (tabs) with their corresponding header columns:

1. **`Users`**
   * Columns: `id`, `name`, `phone`, `role`, `createdAt`
2. **`Buyers`**
   * Columns: `id`, `name`, `phone`, `location`, `pricePerLitre`, `createdAt`
3. **`Sales`**
   * Columns: `id`, `date`, `buyerId`, `buyerName`, `litres`, `pricePerLitre`, `totalAmount`, `amountReceived`, `balance`, `paymentStatus`, `notes`, `createdAt`
4. **`Expenses`**
   * Columns: `id`, `date`, `category`, `amount`, `description`, `notes`, `createdAt`
5. **`Activity_Log`**
   * Columns: `id`, `date`, `action`, `description`, `user`, `createdAt`

*(Note: If headers are left empty, the script will automatically initialize them on first run).*

### Step 3: Open Apps Script
In your Google Sheet, click the top menu:
```text
Extensions → Apps Script
```

### Step 4: Paste Backend Code
Delete any existing code in the editor, and copy the full contents of:
```text
apps-script/Code.gs
```
Paste it into the editor and click the **Save** disk icon.

### Step 5: Deploy as Web App
1. Click **Deploy** (top right) → **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill in the deployment details:
   * **Description:** `DairyPulse Production API`
   * **Execute as:** `Me (your-email@gmail.com)`
   * **Who has access:** `Anyone` *(Crucial so the frontend can securely submit records)*
4. Click **Deploy** and grant Google permissions when prompted.

### Step 6: Copy the Web App URL
Copy the generated Web App URL:
```text
https://script.google.com/macros/s/AKfycb.../exec
```

### Step 7: Configure Environment Variable
In the root directory of this project, create a `.env` file (or paste directly in the app's **More → Database Settings**):
```bash
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

### Step 8: Start the Application
Run:
```bash
npm install
npm run dev
```

---

## 5. Local Development & Verification Commands

All commands run directly from the project root:

```bash
# Install dependencies
npm install

# Run Vite development server on port 3000
npm run dev

# Run TypeScript type check
npm run typecheck

# Build for production
npm run build
```

---

## 6. Project Structure

```text
DairyPulse/
├── package.json               # Root dependencies & scripts
├── README.md                  # This setup documentation
├── .env.example               # Template environment configuration
├── index.html                 # HTML entry point with metadata
├── vite.config.ts             # Vite build configuration
│
├── src/
│   ├── components/            # Reusable UI components
│   │   ├── Header.tsx         # Brand header & connection status
│   │   ├── Navigation.tsx     # Clean 3-tab navigation (Today, Week, More)
│   │   ├── Modal.tsx          # Accessible modal dialog
│   │   ├── RecordMilkModal.tsx# Large input & instant calculation milk entry
│   │   ├── AddExpenseModal.tsx# Farm expense entry form
│   │   ├── RecordPaymentModal.tsx # Collect balances from debtors
│   │   ├── BuyerModal.tsx     # Add/edit milk buyers
│   │   └── DatabaseSettingsModal.tsx # URL tester & guide
│   ├── pages/
│   │   ├── TodayPage.tsx      # Daily notebook: greeting, milk sold, money received
│   │   ├── WeekPage.tsx       # Weekly notebook: Mon-Sun breakdown, top buyers
│   │   └── MorePage.tsx       # Milk history, debtors, buyers, expenses, database
│   ├── services/
│   │   └── api.ts             # Centralized API service with offline fallback
│   ├── hooks/
│   │   └── useDairyData.ts    # React state & metrics calculations
│   ├── types/
│   │   └── index.ts           # TypeScript interfaces & types
│   ├── utils/
│   │   └── formatters.ts      # UGX currency, Litres, dates & summaries
│   ├── data/
│   │   └── demoData.ts        # Realistic initial Ugandan dairy records
│   ├── App.tsx                # Main view router & modal coordination
│   ├── index.css              # Custom farm styling & Bootstrap imports
│   └── main.tsx               # React application entry
│
└── apps-script/
    └── Code.gs                # Complete Google Apps Script backend
```

---

## 7. Reliability & Troubleshooting

### CORS and "Failed to Fetch"
Google Apps Script will reject browser `OPTIONS` preflight requests if `Content-Type: application/json` is sent directly with cross-origin POST requests. 
* DairyPulse resolves this permanently by posting JSON payloads using `Content-Type: text/plain;charset=utf-8` and `redirect: 'follow'`, which Google Apps Script parses seamlessly without triggering CORS preflights.

### Safe Fallback & Demo Mode
If the Apps Script URL is empty, unreachable, or undergoing network latency:
* The app gracefully switches to **Demo / Local Mode**.
* No `undefined`, `NaN`, or blank white screens will ever appear.
* Farmers can record sales, expenses, and payments locally; all numbers update immediately.
