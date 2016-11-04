import { take, put, call, fork, select } from 'redux-saga/effects'
import { Pattern } from 'redux-saga'
import * as api from '../services/api'

import {
  toastAction
} from '../actions'

interface IMoreResult {
  more: boolean,
  offset: number,
  query?: string,
  [propName: string]: any
}

export function* syncSearchResource (
  type: number,
  reducerType: string,
  picUrlKey: string,
  picSize = '100y100'
) {
  yield take(`search/${reducerType}`)

  const resourceKey = reducerType + 's'

  const searchState = yield select((state: any) => state.search)

  const { query = '' } = searchState

  const state = searchState[reducerType]

  const counterKey = `${reducerType}Count`

  if (state.more && query) {
    yield put({
      type: `search/${reducerType}/start`
    })

    const offsetState = state.offset + 15

    const { result } = yield call(
      api.search, query, type.toString(), '15',
      state.offset
    )

    const resource: any[] = result[resourceKey]

    if (resource) {
      yield put({
        type: `search/${reducerType}/save`,
        payload: picUrlKey ? state[resourceKey].concat(resource.map((p) => {
          return Object.assign({}, p, {
            [picUrlKey]: p[picUrlKey] === null ?
            // TODO:
            // placeholder image. maybe use local image instead 
            'http://p4.music.126.net/VnZiScyynLG7atLIZ2YPkw==/18686200114669622.jpg?param=100y100' :
            p[picUrlKey] + `?param=${picSize}`
          })
        })) : state[resourceKey].concat(resource),
        meta: {
          more: result[counterKey] > offsetState ? true : false,
          offset: offsetState
        }
      })
    } else {
      yield put(toastAction('info', '什么也找不到'))
    }

  } else {
    yield put(toastAction('info', '没有更多了'))
  }

  yield put({
    type: `search/${reducerType}/end`
  })
}

export function* syncMoreResource (
  action: string,
  resourceKey: string,
  caller: () => Promise<any>,
  stateSelector: (state: any) => any,
  resultSelector: (result: any) => any[],
  picSize = '100y100'
) {
  yield take(action)

  const state: IMoreResult = yield select(stateSelector)

  if (state.more) {
    yield put({
      type: `${action}/start`
    })

    const offsetState = state.offset + 15
    const result = yield call(
      caller, '15',
      state.offset === 0 ? state.offset.toString()  : offsetState.toString()
    )

    yield put({
      type: `${action}/save`,
      payload: state[resourceKey].concat(resultSelector(result).map(p => {
        return Object.assign({}, p, {
          coverImgUrl: p.coverImgUrl + `?param=${picSize}`
        })
      })),
      meta: {
        more: result.more,
        offset: offsetState
      }
    })
  } else {
    yield put(toastAction('info', '没有更多资源了'))
  }

  yield put({
    type: `${action}/end`
  })
}