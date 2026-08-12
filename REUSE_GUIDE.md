# 3D Product Configurator - Reuse & Setup Guide

This is a complete guide for adapting this 3D product configurator for your own products.

## 🎯 What You Can Reuse

### ✅ Core Architecture & Technology
- **Framework**: Next.js 14 with App Router
- **3D Rendering**: React Three Fiber + Three.js
- **State Management**: Zustand for global state
- **Styling**: Tailwind CSS
- **Internationalization**: Custom i18n system (5+ languages supported)
- **UI Patterns**: Modal system, form handling, file uploads
- **White-label System**: Reseller/branding configuration system
- **Deployment**: Vercel-ready setup

### ✅ Reusable Code Sections
```
src/
├── hooks/               # Custom hooks (useWhiteLabel, useTranslation, etc.)
├── components/          # Reusable UI components
│   ├── BottleSelector   # Product selector component
│   ├── ConfiguratorNavigation # Nav with support modal
│   ├── OptionTabs       # Tab system
│   └── ... (many more)
├── utils/              # Utility functions
├── store/              # Zustand state management
├── i18n/               # Translation system
└── styles/             # Tailwind configuration
```

### ✅ Features You Can Keep
- Multi-language support (easily add your languages)
- White-label/reseller system
- Product color customization
- Design upload & preview
- 3D model viewer with rotation/zoom
- Share & embed functionality
- Email notifications (Resend API)
- Mobile responsive design

---

## 🔒 Security & Access Control

### For Developers Working on This Project

**DO NOT SHARE:**
- ❌ `.env.local` file (contains API keys)
- ❌ Shopify admin API tokens
- ❌ Resend API keys
- ❌ Anthropic API keys
- ❌ Any credentials or secrets

**SAFE TO SHARE:**
- ✅ `.env.example` (template with placeholders)
- ✅ Source code (without .env.local)
- ✅ REUSE_GUIDE.md
- ✅ Documentation

### Setup for New Developers

1. Clone/receive the code (without .env.local)
2. Copy `.env.example` to `.env.local`
3. Ask the project owner for API keys
4. Add keys to their own `.env.local` (never committed)
5. Start developing

### .gitignore Verification

Ensure `.gitignore` includes:
```
.env.local
.env.*.local
```

Never commit `.env.local` to version control.

---

## 🔧 What Needs to Be Changed

### ❌ Product-Specific Files (Must Replace)

**1. Product Data**
```
src/data/bottleTypes.json
```
Replace with YOUR product types. Structure:
```json
{
  "productTypes": [
    {
      "id": 1,
      "name": "Your Product Name",
      "capacity": "500ml",
      "description": "Your description",
      "model": "your-product-500.glb",
      "image": "your-product-500.svg",
      "components": ["component1", "component2"],
      "price": 29.99
    }
  ]
}
```

**2. 3D Models**
```
public/assets/models/
```
Replace .glb files with your own product models. Ensure they have the same component structure as referenced in bottleTypes.json

**3. Product Images/Icons**
```
public/assets/images/
```
Add your product thumbnails/icons

**4. Reseller Configuration**
```
src/data/resellers.ts
```
Update reseller entries or remove if not needed. Each reseller has:
- branding (logo, colors)
- pricing (your reseller's prices)
- supported features
- support email

**5. Branding & Logos**
```
public/assets/images/Logo-*.svg
src/components/LoadingPage.tsx  # Logo display logic
```

**6. API Integrations**
```
src/app/api/
```
- Shopify integration (optional)
- Email provider (Resend - update API key)
- Claude AI endpoints (optional, remove if not needed)

**7. Environment Variables**
```
.env.local
```
Set your own:
- NEXT_PUBLIC_SHOPIFY_STORE_URL
- RESEND_API_KEY
- ANTHROPIC_API_KEY (if using AI features)
- MAPBOX_ACCESS_TOKEN (if using maps)

---

## 🚀 Step-by-Step Setup

### 1. Clone & Install
```bash
git clone <this-repo>
cd 3D-Configurator
npm install
```

### 2. Replace Product Data

**Step 2.1: Update bottleTypes.json**
- Add your product types
- Keep the same JSON structure
- Each product needs a .glb 3D model file

**Step 2.2: Add 3D Models**
- Export your 3D models as .glb format
- Place in `public/assets/models/`
- Name must match the `model` field in bottleTypes.json
- Recommended: Center models, scale appropriately

**Step 2.3: Add Product Images**
- Add thumbnail images to `public/assets/images/`
- SVG recommended for clean scaling
- Name must match the `image` field in bottleTypes.json

### 3. Update Pricing & Resellers

**Step 3.1: Edit src/data/resellers.ts**
```typescript
export const resellers: Record<string, ResellerConfig> = {
  "your-company": {
    id: "your-company",
    companyName: "Your Company Name",
    logoUrl: "/assets/images/your-logo.svg",
    accentColor: "#FF6B6B",  // Your brand color
    stripPrefix: "Your Prefix ",
    supportUrl: "mailto:support@yourcompany.com",
    pricing: {
      "Your Product Name": {
        retail: 29.99,
        tiers: [
          { label: "50-99", min: 50, max: 99, price: 20.99 },
          { label: "100+", min: 100, max: null, price: 18.99 }
        ]
      }
    }
  }
};
```

**Step 3.2: Setup .env.local**
```
# Required
NEXT_PUBLIC_RESELLERS_DOMAIN=yourcompany.com

# For email notifications
RESEND_API_KEY=your_resend_api_key

# Optional (if using Shopify)
NEXT_PUBLIC_SHOPIFY_STORE_URL=your-store.myshopify.com

# Optional (if using AI features)
ANTHROPIC_API_KEY=your_api_key

# Optional (if using maps)
MAPBOX_ACCESS_TOKEN=your_mapbox_token
```

### 4. Update Branding

**Step 4.1: Logos**
- Add your logo to `public/assets/images/`
- Update paths in `src/data/resellers.ts`

**Step 4.2: Colors**
- Set `accentColor` in reseller config
- Update Tailwind theme if needed in `tailwind.config.ts`

**Step 4.3: Translations**
- Keep or remove languages in `src/i18n/config.ts`
- Update `src/i18n/translations/*.json` for your content
- Add new languages by copying existing translation files

### 5. Customize Features

**Optional: Remove Features**
Edit reseller config:
```typescript
features: {
  texture: true,      // All-over print
  map: false,         // Remove map feature
  art: true,
  jersey: false,      // Remove jersey/sports feature
  brand: true
}
```

**Optional: Remove AI Features**
Delete/comment out in `src/app/api/brand/analyze-v8/route.ts` if not using Claude AI

### 6. Setup Environment Variables Securely

**⚠️ CRITICAL: Do NOT commit .env.local**

```bash
# Copy the example file
cp .env.example .env.local

# Edit .env.local and add YOUR OWN API keys
# NEVER share .env.local with anyone
# NEVER commit it to git
```

Add your API keys to `.env.local`:
```
RESEND_API_KEY=your_own_key_here
ANTHROPIC_API_KEY=your_own_key_here
MAPBOX_ACCESS_TOKEN=your_own_token_here
```

### 7. Test Locally
```bash
npm run dev
# Visit http://localhost:3000
```

Access as reseller:
```
http://localhost:3000/en/configurator?reseller=your-company
```

### 8. Deploy to Vercel

```bash
npm run build  # Test production build
git push      # Push to GitHub
# Connect repo to Vercel
# Vercel auto-deploys on push
```

Set environment variables in Vercel dashboard (Project Settings → Environment Variables)

---

## 📋 Customization Checklist

- [ ] Replace 3D models in `public/assets/models/`
- [ ] Update product data in `src/data/bottleTypes.json`
- [ ] Add product images to `public/assets/images/`
- [ ] Update reseller config in `src/data/resellers.ts`
- [ ] Update branding (logos, colors)
- [ ] Setup `.env.local` with API keys
- [ ] Update translations in `src/i18n/translations/`
- [ ] Test locally with `npm run dev`
- [ ] Build for production with `npm run build`
- [ ] Deploy to Vercel or your hosting

---

## 🔌 API Integrations (Optional)

### Email Notifications (Resend)
1. Sign up at https://resend.com
2. Get API key
3. Set `RESEND_API_KEY` in `.env.local`
4. Emails send to reseller email on quote request

### Shopify Integration (Optional)
1. Create Shopify app
2. Get store credentials
3. Set in `.env.local`
4. Uncomment Shopify code in `src/lib/shopify.ts`

### AI Features (Claude API - Optional)
1. Get API key from https://console.anthropic.com
2. Set `ANTHROPIC_API_KEY` in `.env.local`
3. Used for: brand analysis, design generation

### Maps (Mapbox - Optional)
1. Create Mapbox account
2. Get access token
3. Set `MAPBOX_ACCESS_TOKEN` in `.env.local`

---

## 📚 File Structure Reference

```
src/
├── app/
│   └── [locale]/
│       ├── configurator/    # Main configurator page
│       ├── viewer/          # Design preview page
│       └── admin/           # Admin dashboard
├── components/              # React components
├── data/
│   ├── bottleTypes.json    # YOUR PRODUCTS - CHANGE THIS
│   ├── resellers.ts        # YOUR RESELLERS - CHANGE THIS
│   └── b2bPricing.ts       # Default pricing
├── hooks/                   # Custom React hooks
├── i18n/                    # Translation system
├── lib/                     # Utilities
├── store/                   # Zustand state
└── utils/                   # Helper functions

public/
├── assets/
│   ├── images/             # YOUR IMAGES
│   ├── models/             # YOUR 3D MODELS
│   └── ...
└── ...
```

---

## 🐛 Troubleshooting

**Models not appearing?**
- Check .glb file exists in `public/assets/models/`
- Verify filename matches `model` field in bottleTypes.json
- Check browser console for Three.js errors

**Images not loading?**
- Verify image paths in reseller config
- Check files exist in `public/assets/images/`
- Clear browser cache (hard refresh)

**Emails not sending?**
- Verify `RESEND_API_KEY` is set in `.env.local`
- Check email in reseller config is correct
- Check Resend dashboard for error logs

**3D models look wrong?**
- Ensure models are centered at origin
- Check scale (recommend 1-10 units)
- Verify materials/textures are embedded in .glb

---

## 📞 Support

For questions about:
- **3D models**: Check Three.js/Blender documentation
- **Next.js**: https://nextjs.org/docs
- **React Three Fiber**: https://docs.pmnd.rs/react-three-fiber/
- **Tailwind**: https://tailwindcss.com/docs
- **Deployment**: https://vercel.com/docs

---

**Last Updated**: 2026-07-29
**Original Repo**: 3D Shopify Bottle Configurator
