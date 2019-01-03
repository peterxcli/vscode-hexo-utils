import * as vscode from 'vscode';
import * as path from 'path';
import { isHexoProject, getDirFiles, fsRead } from './utils';
import { HexoCommands } from './extension';
import * as matter from 'gray-matter';
import { HexoMetadataUtils, IHexoMetadata } from './hexoMetadata';

export enum ClassifyTypes {
  category = 'categories',
  tag = 'tags',
}

export class HexoClassifyProvider implements vscode.TreeDataProvider<ClassifyItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ClassifyItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  type: ClassifyTypes = ClassifyTypes.category;

  private _hexoMetadataUtils?: HexoMetadataUtils;

  constructor(type: ClassifyTypes) {
    this.type = type;
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ClassifyItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }

  async getChildren(element?: ClassifyItem): Promise<ClassifyItem[]> {
    if (!isHexoProject()) {
      return [];
    }

    const postsPath = path.join(vscode.workspace.rootPath as string, 'source', `_posts`);

    const paths = await getDirFiles(postsPath);

    const filesData: IHexoMetadata[] = [];

    for (let i = 0; i < paths.length; i++) {
      const filePath = path.join(postsPath, paths[i]);
      const content = (await fsRead(filePath)) as string;
      const metadata = matter(content).data as IHexoMetadata;

      filesData.push({
        ...metadata,
        filePath,
      });
    }

    const items: ClassifyItem[] = [];
    if (element && this._hexoMetadataUtils) {
      const classify = this._hexoMetadataUtils[this.type].find((t) => t.name === element.label);

      if (classify) {
        classify.files.forEach((f) => {
          const item = new ClassifyItem(path.basename(f), f);
          items.push(item);
        });
      }
    } else {
      this._hexoMetadataUtils = new HexoMetadataUtils(filesData);
      this._hexoMetadataUtils[this.type].forEach((t) => {
        const item = new ClassifyItem(t.name, undefined, vscode.TreeItemCollapsibleState.Collapsed);
        items.push(item);
      });
    }

    return items;
  }
}

export class ClassifyItem extends vscode.TreeItem {
  constructor(label: string, uri?: string, collapsibleState?: vscode.TreeItemCollapsibleState) {
    super(label, collapsibleState);

    this.iconPath = uri ? vscode.ThemeIcon.File : vscode.ThemeIcon.Folder;

    if (uri) {
      this.resourceUri = vscode.Uri.file(uri);

      this.command = {
        title: 'open',
        command: HexoCommands.open,
        arguments: [uri],
      };
    }
  }
}