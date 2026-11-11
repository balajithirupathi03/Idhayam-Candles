# Idhayam Candles — GitHub Pages website

A simple responsive static website. It includes Home, About, Products, Wholesale and Contact sections. The enquiry form prepares a WhatsApp message (no server or database required).

## 1. Personalise before publishing

- Open `script.js` and replace `91XXXXXXXXXX` with your WhatsApp number in international format, digits only. For India, start with `91` and do not include `+` or spaces.
- In `index.html`, replace the phone, address and email placeholders with your real business details.
- Check the company history and product descriptions before publishing.

## 2. Create a GitHub repository

1. Go to https://github.com/ and sign in (create a free account if needed).
2. Click the **+** icon in the top-right and choose **New repository**.
3. Repository name: `idhayam-candles`.
4. Choose **Public**. You can leave the other options as default.
5. Click **Create repository**.

## 3. Upload the website files

1. In the new repository, choose **Add file → Upload files**.
2. Upload these four files from this ZIP: `index.html`, `style.css`, `script.js`, and `README.md`.
3. Make sure `index.html` is in the repository root (not inside another folder).
4. Click **Commit changes**.

## 4. Enable free GitHub Pages hosting

1. Open the repository's **Settings** tab.
2. In the left menu, choose **Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Set **Branch** to `main` and folder to `/(root)`.
5. Click **Save**.
6. Wait a few minutes, then refresh the Pages settings. GitHub will show the published website link.

Your website address will look like:

`https://YOUR-GITHUB-USERNAME.github.io/idhayam-candles/`

Replace `YOUR-GITHUB-USERNAME` with your GitHub username. If you used another repository name, use that name in the URL.

## 5. Make changes later

Open a file in GitHub, click the pencil/edit icon, make changes and click **Commit changes**. GitHub Pages republishes the site automatically.

## Notes

- GitHub Pages is free for public repositories and serves static files over HTTPS.
- The WhatsApp enquiry form opens WhatsApp with a prefilled message. It does not save enquiries to a website database.
- This starter site does not include online payments, shopping cart, inventory or an admin panel.
- You can connect a custom domain later from **Settings → Pages → Custom domain** after configuring DNS at your domain provider.
