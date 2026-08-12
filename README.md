# 3D Bottle Configurator

A modern 3D bottle configurator built with Next.js, featuring an interactive design interface for customizing bottles.

## Features

- **Interactive 3D Configurator**: Step-by-step bottle customization
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Modern UI**: Beautiful animated landing page with fashionable design
- **Multi-step Configuration**: Bottle, Lid, Ring, and other component options
- **Quantity Selection**: Flexible quantity selection (1-99)
- **Real-time Preview**: Live preview of customizations

## Prerequisites

- Node.js 18+ 
- npm or yarn

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd 3D_bottle-configurator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp env.example .env.local
   ```
   
   Update `.env.local` with any required configuration:
   ```
   NODE_ENV=development
   PORT=3000
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Access the app**
   - Open [http://localhost:3000](http://localhost:3000)
   - Click "Start" to begin configuring your bottle

## Project Structure

```
src/
├── app/
│   ├── configurator/
│   │   └── page.tsx              # 3D configurator page
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
```

## Pages

### Landing Page (`/`)
- Animated background with floating elements
- "Your Bottle" branding
- "Start" button to begin configuration

### Configurator Page (`/configurator`)
- Multi-step configuration interface
- 3D scene placeholder (left panel)
- Configuration options (right panel)
- Navigation between steps: Bottle → Lid → Ring → Other Components
- Quantity selection and Add to Cart functionality

## Usage

1. **Landing Page**: View the animated introduction
2. **Start Configuration**: Click "Start" to enter the configurator
3. **Step-by-step Customization**: Navigate through Bottle, Lid, Ring, and other component options
4. **Quantity Selection**: Choose quantity (1-99) on the final step
5. **Add to Cart**: Complete your configuration

## Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Key Technologies
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **React Hooks** - State management and effects

## Deployment

1. **Build the app**
   ```bash
   npm run build
   ```

2. **Deploy to your preferred platform**
   - Vercel (recommended for Next.js)
   - Netlify
   - AWS
   - Heroku

3. **Update environment variables** in your deployment platform

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.
