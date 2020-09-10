const React = require('react');
const { render } = require('react-dom');
const { connect, Provider } = require('react-redux');

const { _ } = require('lib/locale.js');
const Setting = require('lib/models/Setting.js');

const MainScreen = require('./MainScreen/MainScreen').default;
const ConfigScreen = require('./ConfigScreen/ConfigScreen').default;
const ErrorBoundary = require('./ErrorBoundary').default;
const { OneDriveLoginScreen } = require('./OneDriveLoginScreen.min.js');
const { DropboxLoginScreen } = require('./DropboxLoginScreen.min.js');
const { StatusScreen } = require('./StatusScreen.min.js');
const { ImportScreen } = require('./ImportScreen.min.js');
const { ResourceScreen } = require('./ResourceScreen.js');
const { Navigator } = require('./Navigator.min.js');
const WelcomeUtils = require('lib/WelcomeUtils');
const { app } = require('../app');
const { ThemeProvider, StyleSheetManager, createGlobalStyle } = require('styled-components');
const { themeStyle } = require('lib/theme');

const { bridge } = require('electron').remote.require('./bridge');

const GlobalStyle = createGlobalStyle`
	div, span, a {
		color: ${(props) => props.theme.color};
		font-size: ${(props) => props.theme.fontSize}px;
		font-family: ${(props) => props.theme.fontFamily};
	}
`;

async function initialize() {
	this.wcsTimeoutId_ = null;

	bridge().window().on('resize', function() {
		if (this.wcsTimeoutId_) clearTimeout(this.wcsTimeoutId_);

		this.wcsTimeoutId_ = setTimeout(() => {
			store.dispatch({
				type: 'WINDOW_CONTENT_SIZE_SET',
				size: bridge().windowContentSize(),
			});
			this.wcsTimeoutId_ = null;
		}, 10);
	});

	// Need to dispatch this to make sure the components are
	// displayed at the right size. The windowContentSize is
	// also set in the store default state, but at that point
	// the window might not be at its final size.
	store.dispatch({
		type: 'WINDOW_CONTENT_SIZE_SET',
		size: bridge().windowContentSize(),
	});

	store.dispatch({
		type: 'NOTE_VISIBLE_PANES_SET',
		panes: Setting.value('noteVisiblePanes'),
	});

	store.dispatch({
		type: 'SIDEBAR_VISIBILITY_SET',
		visibility: Setting.value('sidebarVisibility'),
	});

	store.dispatch({
		type: 'NOTELIST_VISIBILITY_SET',
		visibility: Setting.value('noteListVisibility'),
	});
}

class RootComponent extends React.Component {
	async componentDidMount() {
		if (this.props.appState == 'starting') {
			this.props.dispatch({
				type: 'APP_STATE_SET',
				state: 'initializing',
			});

			await initialize(this.props.dispatch);

			this.props.dispatch({
				type: 'APP_STATE_SET',
				state: 'ready',
			});
		}

		await WelcomeUtils.install(this.props.dispatch);
	}

	render() {
		const navigatorStyle = {
			width: this.props.size.width / this.props.zoomFactor,
			height: this.props.size.height / this.props.zoomFactor,
		};

		const theme = themeStyle(this.props.themeId);

		const screens = {
			Main: { screen: MainScreen },
			OneDriveLogin: { screen: OneDriveLoginScreen, title: () => _('OneDrive Login') },
			DropboxLogin: { screen: DropboxLoginScreen, title: () => _('Dropbox Login') },
			Import: { screen: ImportScreen, title: () => _('Import') },
			Config: { screen: ConfigScreen, title: () => _('Options') },
			Resources: { screen: ResourceScreen, title: () => _('Note attachments') },
			Status: { screen: StatusScreen, title: () => _('Synchronisation Status') },
		};

		return (
			<StyleSheetManager disableVendorPrefixes>
				<ThemeProvider theme={theme}>
					<GlobalStyle/>
					<Navigator style={navigatorStyle} screens={screens} />
				</ThemeProvider>
			</StyleSheetManager>
		);
	}
}

const mapStateToProps = state => {
	return {
		size: state.windowContentSize,
		zoomFactor: state.settings.windowContentZoomFactor / 100,
		appState: state.appState,
		themeId: state.settings.theme,
	};
};

const Root = connect(mapStateToProps)(RootComponent);

const store = app().store();

render(
	<Provider store={store}>
		<ErrorBoundary>
			<Root />
		</ErrorBoundary>
	</Provider>,
	document.getElementById('react-root')
);
