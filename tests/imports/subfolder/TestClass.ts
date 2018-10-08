export default class Test {
  
  private static auto_increment = 0;
  
  public id: number;
  
  constructor() {
    this.id = ++Test.auto_increment;
  }
  
}