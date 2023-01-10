import chalk from 'chalk'
import { Response, WrapRequest } from './models'
import { getRequestMatcher } from './requestMatcher'

declare global {
  interface Window {
    fetch: jest.Mock
    XMLHttpRequest: jest.Mock
  }
}

beforeEach(() => {
  global.window.fetch = jest.fn()
  global.window.XMLHttpRequest = jest.fn() as jest.MockedFunction<any>
})

afterEach(() => {
  global.window.fetch.mockRestore()
  global.window.XMLHttpRequest.mockRestore()
})

const createDefaultResponse = async () => {
  const response = {
    json: () => Promise.resolve(),
    status: 200,
    ok: true,
    headers: new Headers({ 'Content-Type': 'application/json' }),
  }

  return Promise.resolve(response)
}

const createResponse = async (mockResponse: Response) => {
  const { responseBody, status = 200, headers, delay } = mockResponse
  const response = {
    json: () => Promise.resolve(responseBody),
    status,
    ok: status >= 200 && status <= 299,
    headers: new Headers({ 'Content-Type': 'application/json', ...headers }),
  }

  if (!delay) return Promise.resolve(response)

  return new Promise(resolve =>
    setTimeout(() => {
      return resolve(response)
    }, delay),
  )
}

const printRequest = (request: WrapRequest) => {
  return console.warn(`
${chalk.white.bold.bgRed('wrapito')} ${chalk.redBright.bold(
    'cannot find any mock matching:',
  )}
  ${chalk.greenBright(`URL: ${request.url}`)}
  ${chalk.greenBright(`METHOD: ${request.method.toLowerCase()}`)}
  ${chalk.greenBright(`REQUEST BODY: ${request._bodyInit}`)}
 `)
}

const mockFetch = async (
  responses: Response[],
  request: WrapRequest,
  debug: boolean,
) => {
  const responseMatchingRequest = responses.find(getRequestMatcher(request))

  if (!responseMatchingRequest) {
    if (debug) {
      printRequest(request)
    }

    return createDefaultResponse()
  }

  const { multipleResponses } = responseMatchingRequest
  if (!multipleResponses) {
    return createResponse(responseMatchingRequest)
  }

  const responseNotYetReturned = multipleResponses.find(
    (response: Response) => !response.hasBeenReturned,
  )

  if (!responseNotYetReturned) {
    if (debug) {
      printMultipleResponsesWarning(responseMatchingRequest)
    }
    return
  }

  responseNotYetReturned.hasBeenReturned = true
  return createResponse(responseNotYetReturned)
}

const mockXHR = (responses: Response[]) => {
  let _method: string
  let _url: string

  const xhr: any = {
    open: (method: string, url: string) => {
      _method = method
      _url = url
    },
    send: () => {
      const request = {
        method: _method,
        url: _url,
      }

      const responseMatchingRequest = responses.find(getRequestMatcher(request))

      xhr.status = responseMatchingRequest?.status || 200
      xhr.response = responseMatchingRequest?.responseBody
      xhr.readyState = 4
      xhr.onreadystatechange && xhr.onreadystatechange()
    },
  }
  return xhr
}

const mockNetwork = (responses: Response[] = [], debug: boolean = false) => {
  const fetch = global.window.fetch

  fetch.mockImplementation((input: WrapRequest, init?: RequestInit) => {
    if (typeof input === 'string') {
      const request = new Request(input, init)
      return mockFetch(responses, request, debug)
    }
    const request = input
    return mockFetch(responses, request, debug)
  })

  const XMLHttpRequest = global.window.XMLHttpRequest
  XMLHttpRequest.mockImplementation(() => mockXHR(responses))
}

const printMultipleResponsesWarning = (response: Response) => {
  const errorMessage = `🌯 Wrapito:  Missing response in the multipleResponses array for path ${response.path} and method ${response.method}.`
  const formattedErrorMessage = chalk.greenBright(errorMessage)

  console.warn(formattedErrorMessage)
}

export { mockNetwork }
