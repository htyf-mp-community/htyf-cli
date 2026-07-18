import { noPromiseApis, needPromiseApis } from './apis-list'

declare const my: any

function processApis (taro) {
  taro.htyf = {}
  const apis = [...noPromiseApis, ...needPromiseApis]

  apis.forEach(key => {
    if (!(key in my.htyf)) {
      taro.htyf[key] = () => {
        console.warn(`红糖云服端小程序暂不支持 ${key}`)
      }
      return
    }

    if (needPromiseApis.has(key)) {
      taro.htyf[key] = (options, ...args) => {
        options = options || {}
        const obj = Object.assign({}, options)
        if (typeof options === 'string') {
          if (args.length) {
            return my.htyf[key](options, ...args)
          }
          return my.htyf[key](options)
        }

        const p: any = new Promise((resolve, reject) => {
          ['fail', 'success', 'complete'].forEach((k) => {
            obj[k] = (res) => {
              options[k] && options[k](res)
              if (k === 'success') {
                resolve(res)
              } else if (k === 'fail') {
                reject(res)
              }
            }
          })
          if (args.length) {
            my.htyf[key](obj, ...args)
          } else {
            my.htyf[key](obj)
          }
        })
        return p
      }
    } else {
      taro.htyf[key] = (...args) => my.htyf[key].apply(my, args)
    }
  })
}


export function initHtyfApi (taro) {
  processApis(taro)
  taro.env = my.env
}
