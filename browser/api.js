require('isomorphic-fetch');
const fetchEmailFromText = require('./fetchEmailFromText.js');


function checkResponseStatus(response) {
  if (response.status >= 200 && response.status < 300) {
    return response;
  } else {
    var error = new Error(response.statusText);
    error.response = response;
    throw error;
  }
}

function parseJSON(response) {
  return response.json()
}

function checkInstagramJsonStatus(payload) {
  if (payload.status !== 'ok') {
    throw new Error('Response json status isn\'t "OK"');
  }
  return payload;
}


function handleFetchError(error) {
  alert(`Request failed: ${error.message}`);
}



function instaQuery(q) {
  return fetch('https://www.instagram.com/query/', {
    method: 'POST',
    credentials: 'include',
    headers: {
      // cookie are used from browser
      'x-csrftoken': window._sharedData.config.csrf_token,

      'accept-encoding': 'gzip, deflate',
      'x-requested-with': 'XMLHttpRequest',
      'pragma': 'no-cache',
      'x-instagram-ajax': 1,
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'accept': 'application/json, text/javascript, */*; q=0.01',
      'cache-control': 'no-cache',
      'authority': 'www.instagram.com',
      'referer': 'https://www.instagram.com/explore/locations/60164/'
    },
    body: 'q=' + encodeURIComponent(q)
  }).then(checkResponseStatus)
    .then(parseJSON)
    .then(checkInstagramJsonStatus)
    .catch(handleFetchError);
}


function processUser(user) {
  if (!user.biography) { return null; }
  const email = fetchEmailFromText(user.biography);
  if (!email) { return null; }
  return Object.assign({}, user, {email});
}

function isPresent(obj) {
   return !!obj;
}

function processMedia({owner}) {
  return processUser(owner);
}


const MAX_PER_QUERY = 1000;
function getFollowers(userId, newDataCB, endCB, stopCB, queryCountPart = `first(${MAX_PER_QUERY})`) {
  instaQuery(`
    ig_user(${userId}) {
      followed_by.${queryCountPart} {
        count,
        page_info {
          end_cursor,
          has_next_page
        },
        nodes {
          id,
          full_name,
          biography,
          username
        }
      }
    }
  `).then(({followed_by}) => {
      if (stopCB()) { return; }
      const usersWithEmails = followed_by.nodes.map(processUser).filter(isPresent);
      newDataCB(usersWithEmails);

      if (followed_by.page_info.has_next_page) {
        getFollowers(userId, newDataCB, endCB, stopCB, `after(${followed_by.page_info.end_cursor}, ${MAX_PER_QUERY})`);
      } else {
        endCB();
      }
    });
}


function getForLocation(locationId, newDataCB, endCB, stopCB, queryCountPart = `first(${MAX_PER_QUERY})`) {
  instaQuery(`
    ig_location(${locationId}) {
      media.${queryCountPart} {
        count,
        page_info {
          end_cursor,
          has_next_page
        },
        nodes {
          owner {
            id,
            full_name,
            biography,
            username
          }
        }
      }
    }
  `).then(({media}) => {
      if (stopCB()) { return; }
      const usersWithEmails = media.nodes.map(processMedia).filter(isPresent);
      newDataCB(usersWithEmails);

      if (media.page_info.has_next_page) {
        getForLocation(locationId, newDataCB, endCB, stopCB, `after(${media.page_info.end_cursor}, ${MAX_PER_QUERY})`);
      } else {
        endCB();
      }
    });
}

function getForTag(tag, newDataCB, endCB, stopCB, queryCountPart = `first(${MAX_PER_QUERY})`) {
  instaQuery(`
    ig_hashtag(${tag}) {
      media.${queryCountPart} {
        count,
        page_info {
          end_cursor,
          has_next_page
        },
        nodes {
          owner {
            id,
            full_name,
            biography,
            username
          }
        }
      }
    }
  `).then(({media}) => {
      if (stopCB()) { return; }
      const usersWithEmails = media.nodes.map(processMedia).filter(isPresent);
      newDataCB(usersWithEmails);

      if (media.page_info.has_next_page) {
        getForTag(tag, newDataCB, endCB, stopCB, `after(${media.page_info.end_cursor}, ${MAX_PER_QUERY})`);
      } else {
        endCB();
      }
    });
}


function getUserIdByName(name) {
  return fetch(`https://www.instagram.com/${name}/?__a=1`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      // cookie are used from browser
      'accept-encoding': 'gzip, deflate',
      'x-requested-with': 'XMLHttpRequest',
      'pragma': 'no-cache',
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'accept': 'application/json, text/javascript, */*; q=0.01',
      'cache-control': 'no-cache',
      'authority': 'www.instagram.com',
      'referer': 'https://www.instagram.com/explore/locations/60164/'
    }
  }).then(checkResponseStatus)
    .then(parseJSON)
    .catch(handleFetchError)
    .then(({user: {id}}) => id);
}


function getFollowersByUserName(name, doWithUsers, doEnd, stopCB) {
  getUserIdByName(name).then(id => getFollowers(id, doWithUsers, doEnd, stopCB));
}


module.exports = {
  getFollowers, getForLocation, getForTag, getUserIdByName, getFollowersByUserName
};
