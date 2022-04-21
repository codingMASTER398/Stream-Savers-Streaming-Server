const Database = require("@replit/database")
const db = new Database()
const express = require('express')
const app = express();
const { nanoid } = require('nanoid')

const secretPath = process.env.secretPath

const runCommand = require('./runCommand.js')

app.use(express.json());

app.get('/',(req,res)=>{
  res.redirect('https://www.youtube.com/watch?v=9Tnux7K3MOQ&list=PLLPzo5hOm16VQrTv7lk0POyv6RiFDqgqn&index=1')
});

app.get("/"+secretPath+"/capacity",(req,res)=>{
  db.list().then(keys => {
    res.send(keys.length.toString())
  }).catch(()=>{
    res.status(500).send()
  });
})

app.get(`/${secretPath}/has/:id`,(req,res)=>{
  db.get(req.params.id).then(value => {
    if(value){
      res.send('Yup')
    }else{
      res.status(404).send('Nope')
    }
  }).catch(()=>{
    res.status(404).send('Nah')
  });
})

app.post(`/${secretPath}/add`,(req,res)=>{
  if(!req.body.urls || !req.body.streamKey){
    res.status(400).send('the hell mate')
  }else{
    db.list().then(keys => {
      if(keys.length > 40){
        res.status(500).send('Nope! Sorry! No room here.')
      }else{
        let managementKey = `${process.env.serverIdentifier}-${nanoid()}`
        db.set(req.body.streamKey, {
          urls: req.body.urls,
          created: Date.now(),
          lc: Date.now(),
          mk: managementKey
        }).then(() => {
          res.json({managementKey:managementKey})
          start(req.body.streamKey)
        }).catch(()=>{
          res.status(500).send('Oh nose') // Haha get it?
        });
      }
    }); 
  }
})

function fromManagementKey(mk){
  return new Promise(async(res,rej)=>{
    db.list().then(async keys => {
      let ret = ``;
      for(let i=0;i<keys.length;i++){
        try{
          let h = await db.get(keys[i])
          if(h.mk && h.mk == mk){
            ret = keys[i];
            break;
          }
        }catch{}
      }
      if(ret == ``){
        rej()
      }else{
        res(ret)
      }
    });
  })
}

app.get(`/${secretPath}/info/:id`,(req,res)=>{
  fromManagementKey(req.params.id).then((streamKey)=>{
    db.get(streamKey).then(value => {
      if(value){
        console.log('yea')
        res.json({
          captcha: value.lc,
          created: value.created
        })
      }else{
        console.log('nf2')
        res.status(404).send(`Not Found`)
      }
    }).catch(()=>{
      console.log('nf1')
      res.status(404).send(`Not Found`)
    });
  }).catch(()=>{
    console.log('inv')
    res.status(400).send(`Invalid Manage Key`)
  })
})

app.post(`/${secretPath}/captcha`,(req,res)=>{
  if(!req.body.manageKey){
    res.status(400).send('the hell mate')
  }else{
    fromManagementKey(req.body.manageKey).then((streamKey)=>{
      db.get(streamKey).then(value => {
        if(value){
          db.set(streamKey, {
            urls: value.urls,
            created: value.created,
            lc: Date.now(),
            mk: value.mk
          }).then(() => {
            res.status(200).send(`Updated`)
          }).catch(()=>{
            res.status(500).send('Oh nose') // Haha get it?
          });
        }else{
          res.status(404).send(`Not Found`)
        }
      }).catch(()=>{
        res.status(404).send(`Not Found`)
      });
    }).catch(()=>{
      res.status(400).send(`Invalid Manage Key`)
    })
  }
})

app.post(`/${secretPath}/del`,(req,res)=>{
  if(!req.body.streamKey){
    res.status(400).send('the hell mate')
  }else{
    console.log(`If you insist`)
    db.delete(req.body.streamKey).then(() => {
      res.status(200).send(`Gone`)
    }).catch((e)=>{
      console.log(e)
      res.status(400).send('Damn')
    });
  }
})

app.put(`/${secretPath}/`,(req,res)=>{
  if(!req.body.urls || !req.body.manageKey){
    res.status(400).send('the hell mate')
  }else{
    fromManagementKey(req.body.manageKey).then((streamKey)=>{
      db.get(streamKey).then(value => {
        if(value){
          db.set(streamKey, {
            urls: req.body.urls,
            created: value.created,
            lc: value.lc,
            mk: value.mk
          }).then(() => {
            res.status(200).send(`Updated`)
          }).catch(()=>{
            res.status(500).send('Oh nose') // Haha get it?
          });
        }else{
          res.status(404).send(`Not Found`)
        }
      }).catch(()=>{
        res.status(404).send(`Not Found`)
      });
    }).catch(()=>{
      res.status(400).send(`Invalid Manage Key`)
    })
  }
})

app.listen(3000)

function start(key){
  db.get(key).then(value => {
    console.log(value);
    let hmm = true
    setTimeout(()=>{
      hmm = false
    },3000)
    runCommand(
      'ffmpeg',
      `-re -i https://cdn.discordapp.com/attachments/964775926829285386/964844545902796811/Loop.mp4 -c copy -f flv rtmp://a.rtmp.youtube.com/live2/${key}`,
      (data) => {
        console.log(data)
      },
      () => {
        if(hmm){
          console.log('No!')
          db.delete(key).then(() => {});
        }else{
          console.log(`Yay! Streaming.`)

          let current = 0

          let endVideo = function(){
            db.delete(key);
            runCommand(
              'ffmpeg',
              `-re -i https://cdn.discordapp.com/attachments/966225601616810014/966597033660141629/End_stream.mp4 -maxrate 2500k -c copy -f flv rtmp://a.rtmp.youtube.com/live2/${key}`,
              () => {},
              () => {}
            )
          }

          let ad = function(){
            db.get(key).then(val => {
              value = val
            }).catch(()=>{})
            
            let hmm = true
            
            setTimeout(()=>{
              hmm = false
            },3000)

            runCommand(
              'ffmpeg',
              `-re -i https://cdn.discordapp.com/attachments/964775926829285386/964844545902796811/Loop.mp4 -maxrate 2500k -c copy -f flv rtmp://a.rtmp.youtube.com/live2/${key}`,
              () => {
              },
              () => {
                if(hmm){
                  console.log('No!')
                  db.delete(key).then(() => {});
                }else{
                  current = 0;
                  if(!value){
                    endVideo()
                  }else{
                    let captchaTime = 86400000
                    if(Date.now() - value.created > 1209600000){
                      let captchaTime = 259200000
                    } else if(Date.now() - value.created > 604800000){
                      captchaTime = 172800000
                    }
                    let timeLeft = captchaTime-(Date.now() - value.lc)

                    if(timeLeft < 0){
                      db.delete(key).then(()=>{
                        endVideo()
                      }).catch(()=>{});
                    }else{
                      next();
                    } 
                  }
                }
              }
            )
          }
          
          let next = function(){
            runCommand(
              'ffmpeg',
              `-re -i https://gotiny.cc/${value.urls[current]} -maxrate 2500k -c copy -r 30 -f flv rtmp://a.rtmp.youtube.com/live2/${key}`,
              () => {
              },
              () => {
                current++
                if(!value.urls[current]){
                  ad();
                }else{
                  next();
                }
              }
            )
          }
          ad()
        }
      }
    )
  });
}

db.list().then(keys => {
  for(let i=0;i<keys.length;i++){
    start(keys[i])
  }
});
