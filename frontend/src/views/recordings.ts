export function RecordingsView(): HTMLElement {
  const recordingsView = document.createElement('section');
  recordingsView.classList.add("recordings-view", "stack");
  recordingsView.innerHTML = `
			<div class="head">
				<h1 class="view-header">Recordings</h1>
				<div class="flex-right-center">
					<button class="immutable highlight-on-cursor">Remove all</button>
					<button class="highlight-on-cursor">Enhance all</button>
					<button class="highlight-on-cursor">Merge</button>
				</div>
			</div>
			<hr>
			<div class="body">
				<section class="recordings-wrapper">
					<div class="recording">
						<div class="left">
							<div class="btn-circle play-icon highlight-on-cursor"></div>
							<div class="info">
								<b>interview_host_final.m4a</b>
								<div class="muted">Naushu - 02:20 sec</div>
								<div class="badges">
									<span class="badge raw">RAW</span>
									<span class="badge transcribed">TRANSCRIBED</span>
									<span class="badge enhanced">ENHANCED</span>
								</div>
							</div>
						</div>
						<div class="right">
							<div class="btn-circle enhance-icon highlight-on-cursor"></div>
							<div class="btn-circle transcript-icon highlight-on-cursor"></div>
							<div class="btn-circle trash-icon highlight-on-cursor"></div>
						</div>
					</div>
				</section>

				<section class="transcript-wrapper">
					<div class="controls">
						<svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
							<path d="M12.67 14H5.33V4.67h7.34m0-1.34H5.33c-.35 0-.69.14-.94.39s-.39.59-.39.94V14c0 .35.14.69.39.94.25.25.59.39.94.39h7.34c.35 0 .69-.14.94-.39.25-.25.39-.59.39-.94V4.67c0-.35-.14-.69-.39-.94s-.59-.39-.94-.39ZM10.67.67H2.67c-.35 0-.69.14-.94.39s-.39.6.39.94V11.33h1.33V2h8V.67Z"/>
						</svg>
						<svg width="13" height="14" viewBox="0 0 14 15" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
							<path d="M8.46 7.5L14 13.44V15h-1.46L7 9.06 1.46 15H0v-1.56L5.54 7.5 0 1.56V0h1.46L7 5.94 12.54 0H14v1.56L8.46 7.5Z"/>
						</svg>
					</div>
					<b>Transcript of interview_host_final.m4a</b>
					<i class="muted">recorded by Hari</i>
					<p>Lorem ipsum dolor sit amet, consecteturnec vel tellus. In hac habitasse platea  dictumst. Phasellus tempus ornare in, maximus vel metus. Cras interdum quam sit amet sem tincidunt fringilla. Vestibulum luctus vehicula gravida. Quisque  aliquam non ipsum eu finibus. Proin ultrices vitae augue sit amet  pellentesque. Sed ex orci, hendrerit nec odio nec, sagittis porta ipsum. Vestibulum augue tortor, congue ut efficitur eu, egestas rutrum diam.  Fusce dignissim erat a risus varius mollis. Cras aliquam lobortis  sapien, nec scelerisque enim ullamcorper nec.</p>
				</section>
			</div>
  `;
  return recordingsView;
}
