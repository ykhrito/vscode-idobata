import * as vscode from 'vscode';

let rp = require('request-promise');

let extension: vscode.ExtensionContext;
let commands: vscode.Disposable[] = [];
let idobata: Idobata | undefined;

class Idobata
{
  static get AUTH_URL(): string { return 'https://idobata.io/oauth/token'; }
  static get API_URL(): string { return 'https://api.idobata.io/graphql'; }
  private token!: string;
  private rooms: { [key: string]: string; } = {};
  private roomId!: string;
  private defaultRoom!: string;
  private rememberRoom: boolean = true;

  constructor(token: string, defaultRoom: string, remember: boolean)
  {
    this.token = token;
    this.defaultRoom = defaultRoom;
    this.rememberRoom = remember;
    this.getRoomNames()
    .catch((err: any) => {
      vscode.window.showErrorMessage('Idobata: Could not get room list.');
      console.log(err);
    });
  }

  dispose() {
  }

  public sendMessage()
  {
    this.selectRoomAsync()
    .then((room) => {
      if (!room) {
        return;
      }
      return vscode.window.showInputBox({
        prompt: '(' + room + ') Please enter message',
        value: ''
      });
    })
    .then((text) => {
      if (!text) {
        return;
      }
      this.sendText(text)
      .then(
        () => {
          vscode.window.showInformationMessage('Message was sent successfully.');
        },
        (error: any) => {
          vscode.window.showErrorMessage('An error occurred while sending message.');
          console.log(error);
        }
      );
    });
  }

  public sendEditorText()
  {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    this.selectRoomAsync()
    .then((room) => {
      if (!room) {
        return;
      }
      this.sendText(Idobata.pre(editor.document.getText()))
      .then(
        () => {
          vscode.window.showInformationMessage('Text was sent successfully.');
        },
        (error: any) => {
          vscode.window.showErrorMessage('An error occurred while sending text.');
          console.log(error);
        }
      );
    });
  }

  public sendEditorTextSelection()
  {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !editor.selection) {
       return;
    }

    this.selectRoomAsync()
    .then((room) => {
      if (!room) {
        return;
      }
      this.sendText(Idobata.pre(editor.document.getText(editor.selection)))
      .then(
        () => {
          vscode.window.showInformationMessage('Text was sent successfully.');
        },
        (error: any) => {
          vscode.window.showErrorMessage('An error occurred while sending text.');
          console.log(error);
        }
      );
    });
  }

  private async selectRoomAsync(): Promise<string>
  {
    return vscode.window.showQuickPick(this.getRoomNamesAsync(), {
      canPickMany: false,
      placeHolder: 'Select a room'
    })
    .then((selected) => {
      if (!selected) {
        this.roomId = '';
        return Promise.resolve('');
      } else {
        this.roomId = this.getRoomId(selected);
        return Promise.resolve(selected);
      }
    });
  }

  private static pre(text: string): string
  {
    if (!text.endsWith('\n')) {
      text += '\n';
    }
    return `~~~\n${text}~~~`;
  }

  private sendText(text: string)
  {
    if (!this.roomId) {
      return;
    }

    const mutation = 'mutation ($input: CreateMessageInput!) { createMessage(input: $input) { clientMutationId }}';
    const payload = {
      'input': {
        'roomId': this.roomId,
        'source': text,
        'format': 'MARKDOWN'
    }};

    return this.sendQuery({
      'query': mutation,
      'variables': payload
    });
  }

  private async getRoomNamesAsync(): Promise<string[]>
  {
    if (Object.keys(this.rooms).length > 0) {
      return this.getRoomNames();
    } else {
      return this.getRoomList()
      .then((body: any) => {
        body.data.viewer.rooms.edges.forEach((edge: any) => {
          this.rooms[edge.node.name] = edge.node.id;
        });
        return this.getRoomNames();
      });
    }
  }

  private getRoomList()
  {
    return this.sendQuery({
      'query': 'query { viewer { rooms { edges { node { id name } } } } }'
    });
  }

  private getRoomNames(): Promise<string[]>
  {
    var names = new Array<string>();
    Object.keys(this.rooms).forEach((name) => {
      if (name === this.defaultRoom) {
        names.unshift(name);
      } else {
        names.push(name);
      }
    });
    return Promise.resolve<string[]>(names);
  }

  private getRoomId(roomName: string): string
  {
    var roomId: string = "";
    Object.keys(this.rooms).forEach((name) =>{
      if (name === roomName) {
        roomId = this.rooms[name];
        if (this.rememberRoom) {
          this.defaultRoom = name;
        }
      }
    });
    return roomId;
  }

  private sendQuery(json: object)
  {
    return rp({
      method: 'POST',
      uri: Idobata.API_URL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + this.token
      },
      body: json,
      json: true
    });
  }
}

function dispose()
{
  if (idobata) {
    idobata.dispose();
  }
  idobata = undefined;

  while (commands.length > 0) {
    const command = commands.shift();
    try
    {
      if (command) {
        command.dispose();
      }
    }
    catch(err)
    {
      console.log(err);
    }
  }
}

function loadConfigurations()
{
  dispose();

  const configuration = vscode.workspace.getConfiguration('idobata');

  const accessToken: string | undefined = configuration.get('accessToken');
  if (!accessToken)
  {
    vscode.window.showErrorMessage('Idobata: Please set accessToken in configuration.');
    return;
  }
  const defaultRoom: string = configuration.get('defaultRoom') || '';
  const rememberRoom: boolean = configuration.get('rememberRoom') || false;

  //idobata = new Idobata(username, password, defaultRoom, rememberRoom);
  idobata = new Idobata(accessToken, defaultRoom, rememberRoom);
}

export function activate(context: vscode.ExtensionContext) {
  extension = context;

	extension.subscriptions.push(
    vscode.commands.registerCommand('idobata.sendMessage', () => {
      if (idobata) { idobata.sendMessage(); }
    }),
    vscode.commands.registerCommand('idobata.sendEditorText', () => {
      if (idobata) { idobata.sendEditorText(); }
    }),
    vscode.commands.registerCommand('idobata.sendEditorTextSelection', () => {
      if (idobata) { idobata.sendEditorTextSelection(); }
    })
  );

  extension.subscriptions.push(vscode.workspace.onDidChangeConfiguration(() => loadConfigurations()));

	loadConfigurations();
	commands = extension.subscriptions;
}

export function deactivate() {
  dispose();
}
