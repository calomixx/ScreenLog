async function check() {
  const res = await fetch('http://localhost:3000/api/media');
  const json = await res.json();
  console.log('Media count:', json.data.length);
}
check();
