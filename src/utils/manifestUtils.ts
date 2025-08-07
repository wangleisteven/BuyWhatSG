// Utility to generate dynamic manifest based on current domain
export const generateManifestForDomain = () => {
  const currentOrigin = window.location.origin;
  
  return {
    name: "BuyWhatSG - Shopping List App",
    short_name: "BuyWhatSG",
    description: "A simple shopping list app to help you organize your shopping",
    start_url: `${currentOrigin}/`,
    scope: `${currentOrigin}/`,
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#4caf50",
    icons: [
      {
        src: `${currentOrigin}/apple-touch-icon.svg`,
        sizes: "180x180",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: `${currentOrigin}/masked-icon.svg`,
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable"
      },
      {
        src: `${currentOrigin}/pwa-192x192.svg`,
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: `${currentOrigin}/pwa-512x512.svg`,
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: `${currentOrigin}/pwa-192x192.svg`,
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "maskable"
      }
    ],
    shortcuts: [
      {
        name: "Add Item",
        short_name: "Add",
        description: "Add a new item to your shopping list",
        url: `${currentOrigin}/add`,
        icons: [{ src: `${currentOrigin}/pwa-192x192.svg`, sizes: "192x192" }]
      }
    ],
    categories: ["shopping", "productivity", "lifestyle"],
    protocol_handlers: [
      {
        protocol: "web+buywhatsg",
        url: `${currentOrigin}/?handler=%s`
      }
    ],
    url_handlers: [
      {
        origin: currentOrigin
      }
    ],
    handle_links: "preferred"
  };
};

// Function to update manifest dynamically
export const updateManifestForCurrentDomain = () => {
  const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
  if (manifestLink) {
    const manifest = generateManifestForDomain();
    const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], {
      type: 'application/json'
    });
    const manifestURL = URL.createObjectURL(manifestBlob);
    manifestLink.href = manifestURL;
  }
};