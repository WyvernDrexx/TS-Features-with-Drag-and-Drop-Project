interface Validatable {
  value: string | number;
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  max?: number;
  min?: number;
}

interface Draggable {
  dragStartHandler(event: DragEvent): void;
  dragEndHandler(event: DragEvent): void;
}

interface DragTarget {
  dragOverHandler(event: DragEvent): void;
  dropHandler(event: DragEvent): void;
  dragLeaveHandler(event: DragEvent): void;
}

//enums practise

enum Status {
  Active,
  Finished,
}

//class as a Type

class Project {
  constructor(
    public id: string,
    public title: string,
    public description: string,
    public people: number,
    public status: Status
  ) {}
}


//Type practise
type Listener<T> = (items: T[]) => void;


//Decorators's use case to make a autobind  decorator
function autobind(_: any, _1: string, descriptor: PropertyDescriptor) {
  const originalFunction = descriptor.value;
  const newDescriptor: PropertyDescriptor = {
    configurable: true,
    get() {
      return originalFunction.bind(this);
    },
  };
  return newDescriptor;
}

//abstract class for us along with Generic type practise
abstract class Component<T extends HTMLElement, U extends HTMLElement> {
  templateElement: HTMLTemplateElement;
  hostElement: T;
  element: U;

  constructor(
    templateId: string,
    hostId: string,
    elementPosition: "beforeend" | "afterbegin",
    elementId?: string
  ) {
    this.templateElement = document.getElementById(
      templateId
    )! as HTMLTemplateElement;
    this.hostElement = document.getElementById(hostId)! as T;
    const importedNode = document.importNode(
      this.templateElement.content,
      true
    );
    this.element = importedNode.firstElementChild as U;
    if (elementId) this.element.id = elementId;
    this.attach(elementPosition);
  }

  private attach(position: "beforeend" | "afterbegin") {
    this.hostElement.insertAdjacentElement(position, this.element);
  }

  abstract configure(): void;
  abstract renderContent(): void;
}

//Extending Generics type
class ProjectInput extends Component<HTMLDivElement, HTMLFormElement> {
  titleInputElement: HTMLInputElement;
  descriptionInputElement: HTMLInputElement;
  peopleInputElement: HTMLInputElement;

  constructor() {
    super("project-input", "app", "afterbegin", "user-input");
    this.titleInputElement = this.element.querySelector(
      "#title"
    )! as HTMLInputElement;
    this.descriptionInputElement = this.element.querySelector(
      "#description"
    )! as HTMLInputElement;
    this.peopleInputElement = this.element.querySelector(
      "#people"
    )! as HTMLInputElement;
    this.configure();
  }

  configure() {
    this.element.addEventListener("submit", this.submitHandler);
  }

  private isInputsValid(...inputs: Validatable[]): boolean {
    for (let i of inputs) {
      if (typeof i.value === "string") {
        if (i.required && !i.value.trim().length) return false;
        if (i.maxLength && i.value.trim().length > i.maxLength) return false;
        if (i.minLength && i.value.trim().length < i.minLength) return false;
      }
      if (typeof i.value === "number") {
        if (i.required && !i.value) return false;
        if (i.max && +i.value > i.max) return false;
        if (i.min && +i.value < i.min) return false;
      }
    }
    return true;
  }

  renderContent() {}

  private clearInputs(): void {
    this.titleInputElement.value = "";
    this.descriptionInputElement.value = "";
    this.peopleInputElement.value = "";
  }

  private getInputs(): [string, string, number] | void {
    const title = this.titleInputElement.value;
    const description = this.descriptionInputElement.value;
    const people = this.peopleInputElement.value;

    if (
      this.isInputsValid(
        { value: title, required: true },
        { value: description, required: true },
        { value: +people, max: 10, required: true }
      )
    ) {
      return [title, description, +people];
    }
  }

  //use case of decorators
  @autobind
  private submitHandler(event: Event) {
    event.preventDefault();
    const userInputs = this.getInputs();
    if (!userInputs) return alert("Invalid Inputs!");
    const [title, description, people] = userInputs;
    projectState.addProjects(
      Math.random().toString(),
      title,
      description,
      people
    );
    this.clearInputs();
  }
}

//implementing an interface
class ProjectsList
  extends Component<HTMLDivElement, HTMLElement>
  implements DragTarget {
  assignedProjects: Project[];

  constructor(private projectType: "active" | "finished") {
    super("project-list", "app", "beforeend", `${projectType}-projects`);
    this.assignedProjects = [];
    this.configure();
    this.renderContent();
  }

  @autobind
  dropHandler(e: DragEvent) {
    e.preventDefault();
    const id = e.dataTransfer!.getData("text/plain");
    projectState.moveProjects(
      id,
      this.projectType === "active" ? Status.Active : Status.Finished
    );
  }

  @autobind
  dragLeaveHandler(_: DragEvent) {
    const el = this.element.querySelector("ul")!;
    el.classList.remove("droppable");
  }

  @autobind
  dragOverHandler(e: DragEvent) {
    if (e.dataTransfer && e.dataTransfer.types[0] === "text/plain") {
      e.preventDefault();
      const el = this.element.querySelector("ul")!;
      el.classList.add("droppable");
    }
  }

  configure() {
    this.element.addEventListener("dragover", this.dragOverHandler);
    this.element.addEventListener("dragleave", this.dragLeaveHandler);
    this.element.addEventListener("drop", this.dropHandler);

    projectState.addListener((projects: Project[]) => {
      const relevantProjects = projects.filter((item) => {
        if (this.projectType === "active") return item.status === Status.Active;
        return item.status === Status.Finished;
      });
      this.assignedProjects = relevantProjects;
      this.renderProjects();
    });
  }

  renderContent() {
    const listId = `${this.projectType}-projects-list`;
    this.element.querySelector("ul")!.id = listId;
    this.element.querySelector("h2")!.textContent =
      this.projectType.toUpperCase() + " PROJECTS";
  }

  private renderProjects() {
    const listItem: HTMLUListElement = document.getElementById(
      `${this.projectType}-projects-list`
    )! as HTMLUListElement;
    listItem.innerHTML = "";
    for (const prjItem of this.assignedProjects) {
      new ProjectItems(this.element.querySelector("ul")!.id, prjItem);
    }
  }
}

//a generic class
class State<T> {
  protected listeners: Listener<T>[];

  constructor() {
    this.listeners = [];
  }

  addListener(listenerFn: Listener<T>) {
    this.listeners.push(listenerFn);
  }
}

class ProjectItems
  extends Component<HTMLUListElement, HTMLLIElement>
  implements Draggable {
  project: Project;

  get persons(): string {
    if (this.project.people === 1) return "1 person";
    return `${this.project.people} persons`;
  }

  @autobind
  dragStartHandler(e: DragEvent) {
    e.dataTransfer!.setData("text/plain", this.project.id);
    e.dataTransfer!.effectAllowed = "move";
  }

  @autobind
  dragEndHandler(_: DragEvent) {
  }

  constructor(hostId: string, project: Project) {
    super("single-project", hostId, "beforeend", project.id);
    this.project = project;
    this.configure();
    this.renderContent();
  }

  configure() {
    this.element.addEventListener("dragstart", this.dragStartHandler);
    this.element.addEventListener("dragend", this.dragEndHandler);
  }
  renderContent() {
    this.element.querySelector("h2")!.textContent = this.project.title;
    this.element.querySelector("h3")!.textContent = this.persons + " assigned";
    this.element.querySelector("p")!.textContent = this.project.description;
  }
}

class ProjectState extends State<Project> {
  private projects: Project[];
  private static instance: ProjectState;

  private constructor() {
    super();
    this.projects = [];
  }

  static getInstance() {
    if (this.instance) return this.instance;

    this.instance = new ProjectState();
    return this.instance;
  }

  addProjects(id: string, title: string, description: string, people: number) {
    this.projects.push(
      new Project(id, title, description, people, Status.Active)
    );

    this.updateListeners();
  }

  moveProjects(id: string, status: Status) {
    const project = this.projects.find((prj) => prj.id === id);
    if (project && project.status !== status) {
      project.status = status;
      this.updateListeners();
    }
  }

  private updateListeners() {
    for (const fn of this.listeners) {
      fn(this.projects.slice()); // We use Array.splice to pass the copy of the array, cuz if we pass `this.projects`
    } //the reference is sent instead of copy which might introduce bugs
  }
}
const projectState = ProjectState.getInstance();
const project = new ProjectInput();

//Here we use same class to render two completely differnt UI and behaviour
const activeProjects = new ProjectsList("active");
const finishedProjects = new ProjectsList("finished");
