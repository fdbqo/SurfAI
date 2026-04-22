/**
 * Web Push (Sets) — expects push payload as plain text JSON, ideally:
 * { "title": "...", "body": "...", "url": "/" }
 * See PushNotificationsPanel: register with ?v= to bust stale workers after updates.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

const DEFAULT_TITLE = 'Sets'
const FALLBACK_BODY = 'Open the app for the latest.'

function tagForPayload(d) {
  if (d && typeof d === 'object') {
    if (typeof d.tag === 'string' && d.tag) return d.tag
    if (d.dedupeKey != null && String(d.dedupeKey)) return String(d.dedupeKey)
    if (d.id != null && String(d.id)) return String(d.id)
  }
  return 'surf-' + Date.now()
}

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async function () {
      var title = DEFAULT_TITLE
      var body = FALLBACK_BODY
      var notifUrl = '/'
      var tag = 'surf-' + Date.now()

      try {
        if (!event.data) {
          await self.registration.showNotification(title, {
            body: body,
            data: { url: notifUrl },
            tag: tag,
          })
          return
        }

        var text = await event.data.text()
        if (!text || !String(text).trim()) {
          await self.registration.showNotification(title, {
            body: body,
            data: { url: notifUrl },
            tag: 'surf-' + Date.now(),
          })
          return
        }

        var d = JSON.parse(String(text).trim())
        if (!d || typeof d !== 'object') {
          throw new Error('not an object')
        }

        tag = tagForPayload(d)

        if (typeof d.title === 'string' && d.title) title = d.title
        else if (d.decision && typeof d.decision.title === 'string' && d.decision.title) {
          title = d.decision.title
        }

        if (typeof d.body === 'string' && d.body) body = d.body
        else if (typeof d.message === 'string' && d.message) body = d.message
        else if (d.decision && typeof d.decision.message === 'string' && d.decision.message) {
          body = d.decision.message
        } else {
          body = FALLBACK_BODY
        }

        if (typeof d.url === 'string' && d.url) notifUrl = d.url

        if (typeof body === 'string' && body.length > 0 && (body[0] === '{' || body.length > 2000)) {
          if (body[0] === '{') body = FALLBACK_BODY
        }
        if (body.length > 400) {
          body = body.slice(0, 397) + '…'
        }

        await self.registration.showNotification(title, {
          body: body,
          data: { url: notifUrl },
          tag: tag,
        })
      } catch (e) {
        await self.registration.showNotification(DEFAULT_TITLE, {
          body: FALLBACK_BODY,
          data: { url: '/' },
          tag: 'surf-' + Date.now(),
        })
      }
    })()
  )
})

self.addEventListener('notificationclick', function (event) {
  var raw = event.notification && event.notification.data && event.notification.data.url
  var path = typeof raw === 'string' ? raw : '/'
  var target =
    path.indexOf('http') === 0 ? path : self.location.origin + (path.charAt(0) === '/' ? path : '/' + path)
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      if (clientList.length) {
        for (var i = 0; i < clientList.length; i++) {
          var c = clientList[i]
          if (c.focus) {
            if (c.navigate) c.navigate(target)
            return c.focus()
          }
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(target)
      }
    })
  )
})
