setInterval(() => {
  const [current=bug.firstElementChild] = bug.getElementsByClassName('visible')
  current.classList.remove('visible')
  const next = current.nextElementSibling || bug.firstElementChild
  next.classList.add('visible')    
}, 30 * 1000)

bug.addEventListener('transitionend', () => {
  const current = bug.getElementsByClassName('visible')[0]
  if (!current) return
  bug.appendChild(current)
})