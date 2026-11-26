(function () {
  const main = document.querySelector("[data-require-login]");
  if (!main || !window.HuashanhuAuth) return;
  const wall = document.querySelector("[data-invite-wall]");
  if (window.HuashanhuAuth.session()) {
    main.hidden = false;
    if (wall) wall.hidden = true;
    return;
  }
  main.hidden = true;
  if (wall) wall.hidden = false;
})();
