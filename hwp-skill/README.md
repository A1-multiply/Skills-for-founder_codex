# A1-founder-hwp 스킬 번들

이 폴더는 Codex에서 한글(HWP/HWPX) 문서를 읽고, 분석하고, 개요표를 만드는 스킬 번들입니다.

## 핵심 스킬

- `skill/hwp-document-suite/SKILL.md`
  - 실제 호출 스킬 본체입니다.
  - 스킬 이름은 `A1-founder-hwp`입니다.
  - HWP/HWPX 읽기, 구조 분석, 개요표 작성, 셀 채우기, 간단 편집 흐름을 담당합니다.

## 기본 사용 흐름

1. Codex에서 `@A1-founder-hwp`로 호출합니다.
2. 기본 샘플인 `../Sample/창업아이템 개요부분.hwp`를 시작점으로 씁니다.
3. 내용은 표 안에만 채우고, 양식과 제목은 되도록 유지합니다.
4. 이미지가 필요하면 마지막 이미지 칸에만 넣습니다.

## 설치

- Codex에서 이 저장소를 설치해 달라고 요청하면 됩니다.
- GitHub 주소는 다음을 사용하면 됩니다.
  - `https://github.com/A1-multiply/Skills-for-founder_codex.git`
- 설치가 끝나면 `A1-founder-hwp` 스킬이 Codex에 등록됩니다.

## 포함 파일

- `skill/hwp-document-suite/SKILL.md`
  - 스킬 지침
- `Sample/`
  - 기본 시작용 한글 샘플
- `examples/`
  - 예시용 spec / 샘플 데이터
- `docs/`
  - 간단 사용 안내

## 정리된 원칙

- 기본 출력은 이미지 없이 먼저 만듭니다.
- 표 밖의 제목, 폼 제목, 페이지 구조는 가능한 유지합니다.
- 표 안의 내용은 짧고 읽기 쉽게 적습니다.
- 새 작업은 저장소 루트의 `Sample/창업아이템 개요부분.hwp`를 기준으로 시작합니다.
