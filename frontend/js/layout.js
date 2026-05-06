(function () {
  const NAV_LINKS = [
    { href: 'index.html',         label: 'Events'        },
    { href: 'create-wallet.html', label: 'Create Wallet' },
    { href: 'balance.html',       label: 'My Tickets'    },
    { href: 'buy.html',           label: 'Buy Tickets'   },
    { href: 'transfer.html',      label: 'Transfer'      },
  ];

  const currentFile = window.location.pathname.split('/').pop() || 'index.html';

  const navHTML = NAV_LINKS.map(({ href, label }) => {
    const active = href === currentFile ? ' class="nav-active"' : '';
    return `<a href="${href}"${active}>${label}</a>`;
  }).join('\n      ');

  document.getElementById('site-header').innerHTML = `
    <a href="index.html" class="site-logo">🎟 Sepolia Ticketing</a>
    <nav class="site-nav">
      ${navHTML}
    </nav>`;

  document.getElementById('site-footer').innerHTML =
    '<p>Sepolia Ticketing System — Testnet only. All transactions are on the Sepolia blockchain.</p>';
})();
