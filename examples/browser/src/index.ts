import * as litehouse from "litehouse-browser";

addEventListener('load', () => {
  const urlField = document.getElementById('lighthouse-url') as HTMLInputElement;
  const usernameField = document.getElementById('lighthouse-username') as HTMLInputElement;
  const tokenField = document.getElementById('lighthouse-token') as HTMLInputElement;
  const connectButton = document.getElementById('lighthouse-connect');

  connectButton.addEventListener('click', async () => {
    const lh = await litehouse.connect({ url: urlField.value });
    console.log('Connected!');
  });
});
