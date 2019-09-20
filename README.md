# Visual Studio Code Idobata Extension

## Features

Send message or editor text to idobata.

## Settings

* `idobata.accessToken` (required)
  * Specify Idobata API Access Token. Please [see here](https://idobata.io/ja/api) how to get a token.
* `idobata.defaultRoom` (optional, default: null)
  * Default room name.
* `idobata.rememberRoom` (optional, default: true)
  * Set previously selected room to default.

### Example Initial Configuration

```json
"idobata.accessToken": "blah blah blah",
"idobata.defaultRoom": {
  "organization": "Foo Bar Electronics",
  "room": "lounge"
},
"idobata.rememberRoom": true
```


## Usage

Open Command Palette (Ctrl + Shift + P / Cmd + Shift + P), type "idobata" and select a command:

* `Idobata: Send a message`
  * Send a message you type.
* `Idobata: Send text in current editor`
  * Send current editor content.
* `Idobata: Send selected text`
  * Send current selected text.

## License

MIT

## Releases

### 0.0.2

Handle the organization properly.

### 0.0.1

Initial release.
