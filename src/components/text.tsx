import * as React from "react";

interface IProps {
  text: string;
}
interface IState {}

export class Text extends React.Component<IProps, IState> {
  public render() {
    const { text } = this.props;
    return (
      <div>
        {text}
      </div>
    );
  }
}
