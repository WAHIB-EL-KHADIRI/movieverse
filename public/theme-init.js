try {
  var t = localStorage.getItem('movieverse:theme');
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
} catch (e) {}
