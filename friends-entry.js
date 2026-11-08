// Compatibility for previously shared friends.html links and bookmarks.
(()=>{
 const target=new URL('app.html',location.href);target.searchParams.set('view','friends');
 const invite=new URLSearchParams(location.search).get('invite');
 if(invite&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(invite))target.searchParams.set('invite',invite);
 document.getElementById('friends-entry-link').href=target.href;location.replace(target.href);
})();
